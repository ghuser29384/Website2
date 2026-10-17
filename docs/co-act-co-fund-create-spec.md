# Co-Act and Co-Fund in Create

Status: implementation specification for a draft, runtime-affecting pull request

This document is the durable product and engineering source of truth for adding group contributions to the **What could you offer?** step of `/trades/new`.

## 1. Release boundary

The first release is **proposal-only**.

It may let a user describe, review, save, and submit proposed Co-Act or Co-Fund terms. It must not, merely because a proposal contains these terms:

- create an active group commitment;
- enroll another person;
- reserve, authorize, capture, escrow, bridge, refund, or disburse money;
- execute a no-pool fallback;
- create a recurring debit;
- spend Moral Trade's processing-fee promotion;
- raise a participant's obligation;
- publish an invitation-only participant's identity;
- mark evidence verified;
- award verified impact credit; or
- modify a reliability score.

Every executable capability must remain behind a server-controlled, independently releasable gate. Unknown or executable-authority fields fail closed.

## 2. Mechanism taxonomy

### Co-Act

Co-Act is the group-action umbrella. It has two structures:

1. **Same action** — participants make substantially identical commitments.
2. **Complementary roles** — participants undertake different, explicitly named obligations toward one shared result.

Co-Act may modify any nonfinancial contribution type, including behavior changes, skilled work, and other lawful nonfinancial contributions.

### Co-Fund

A Co-Fund is a linked group contribution to one reciprocal trade or fixed project. Participants jointly cover one frozen target through an exact final allocation. Shares may be equal or unequal.

A Co-Fund is distinct from a standalone Public Goods Pool:

- a Co-Fund produces one exact, frozen allocation for one linked trade/project;
- a Public Goods Pool aggregates independent conditional pledges toward one or more thresholds and may support assurance or dominant-assurance incentives.

The implementation must preserve the repository's canonical Discover taxonomy and must not duplicate one Co-Fund as both an Offer and a standalone Pool. The existing `poolTerms.commonGround` model remains canonical for standalone Co-Fund creation. Offer-linked Co-Fund terms are stored only as a private modifier on the relevant trade option; they do not create a second standalone pool or a parallel live payment mechanism. A later activation service must reconcile both entry surfaces into the same authoritative group-agreement and funding contracts.

## 3. Shared group-contribution model

Co-Act and Co-Fund share these primitives:

- immutable proposal/version identifier;
- contribution-option identifier;
- group mode and subtype;
- participant ceiling of 100, shared with the standalone Co-Fund entry surface;
- a required, initially unselected creator-participation decision;
- account-bound participant and external-invitee targets;
- visibility: public, unlisted, or invitation-only;
- eligibility requirements;
- existing-group reference or create-new-group intent;
- relationship between several group options: alternatives or cumulative;
- recruitment deadline;
- activation rule;
- participation agreement version;
- audit metadata;
- proposal-only execution state.

Eligibility uses a structured allowlist rather than executable free text. Supported initial criteria are:

- minimum Moral Trade reliability score;
- verified geographic eligibility;
- verified skill or credential;
- invitation membership.

Each criterion records the required evidence level: self-declared, profile-verified, document-verified, or independently verified.

The creator may attach an existing compatible group or create a new one. Compatibility requires identical material terms, including action/project, allocation or obligation terms, deadline, evidence policy, visibility policy, and agreement version.

Participant identity uses the immutable Moral Trade profile UUID as the authority and the selected username/display name as an audit snapshot. Typing text never silently resolves an account: the creator must explicitly select a suggestion. Duplicate account selection is rejected. Existing accounts without a username are not searchable until their holder chooses one; Moral Trade does not generate provisional usernames. A separate external-invitee target may retain only a display label and a future private claim-link intent in this release. Ordinary proposal payloads store no invitee email address or phone number.

The creator must answer **Are you participating?** with neither answer preselected. A participating creator appears exactly once as an account-bound participant. An organizer-only creator does not count as a participant and cannot submit participant-owned terms. Selecting any participant while drafting sends no notification and enrolls nobody. Invitations are a later explicit publication action.

## 4. Create-page interaction

Each concrete offer option keeps its underlying contribution type and adds a group modifier.

For a nonfinancial option, show:

- **Solo**
- **Act together** with the published mechanism label **Co-Act**

For a funding option, show:

- **Solo**
- **Fund together** with the published mechanism label **Co-Fund**

Use the current Create visual system. Do not introduce a separate full-page wizard inside this step. Show the minimum fields inline and place the remaining terms under **Advanced terms**.

When the requested action and offered Co-Act appear materially identical, show an explicit prompt:

> Do this together?
>
> Count the other party's requested action as their participation in this Co-Act.

Never infer enrollment or double-count the same performance.

The compact form must produce a deterministic natural-language summary for review. Examples:

- `I will avoid meat for one meal per week if 9 other people do the same.`
- `$50 target · $5 each · 10 funded slots.`

## 5. Co-Act terms

### 5.1 Structure and membership

Supported structures:

- same action;
- complementary roles.

Supported activation modes:

- **Act together without a minimum** — each accepted participant's obligation can begin independently;
- **Act only if at least N eligible people join**.

The creator first chooses whether they participate or organize only. If participating, the creator separately chooses whether their own accepted obligation counts toward a participant minimum. An organizer-only creator never counts.

The creator chooses whether late joining is prohibited, uses the original end date, or gives each late participant the full duration.

Public groups show identities according to the accepted pending-invitation and participation rules. A user who has disabled public invitation mentions remains privately discoverable but appears publicly as **Pending invitee** until acceptance rather than being named. Invitation-only creators and accepted participants can see the bound participants; outsiders cannot. Invitation-only participant identities become public after any terminal state—successful completion, failure, expiry, or cancellation—only when every affected participant accepted that disclosure term before joining.

### 5.2 Activation and performance start

Activation and performance start are separate concepts.

Activation may occur:

- immediately when the condition is met; or
- after a creator-selected confirmation period.

Performance may begin:

- immediately after activation; or
- on a predetermined future date.

A scheduled date never bypasses an unmet activation condition.

The creator also chooses whether participants perform during the same overall period or at the same time. Coordination may use notifications only, announcements and reminders, or an optional participant discussion thread. These choices are proposal terms, not authority to notify, publish, or open a live discussion before activation is independently released.

### 5.3 Obligations and rewards

Same-action Co-Acts use an identical action definition. Quantity or frequency may vary only where the published terms allow it.

Complementary-role Co-Acts use named roles. Automatic reassignment is allowed only for work marked divisible or transferable and only to participants who satisfy the role's eligibility requirements.

The creator chooses before publication between:

- one fixed group reward divided by the published allocation rule; or
- a fixed reward per qualifying participant or verified unit.

No later term change may confiscate reward already earned for verified units except after fraud or reversal is established through the dispute process.

### 5.4 Additionality and impact attribution

Before joining, collect the participant's expected baseline behavior or output.

- Prefer prior verified behavior when available.
- Otherwise use self-report.
- Let the participant correct an inferred baseline.
- Record evidence quality and uncertainty.

Keep the detailed baseline private. Other users may see only the incremental commitment, calculation method, and confidence level.

Estimated impact credit equals verified performance minus the accepted baseline, bounded below by zero. One performance may support several disclosed commitments, but causal/impact credit must be divided so it is not multiply counted.

### 5.5 Evidence and nonperformance

Evidence policy is risk-based. Low-risk actions may use self-attestation; higher-risk or high-value claims may require stronger evidence or an independent verifier.

Represent these states separately:

- confirmed miss;
- late completion;
- missing evidence;
- rejected evidence;
- disputed evidence;
- partial completion;
- authorized withdrawal;
- unauthorized post-activation withdrawal.

The creator may define disclosed grace periods, allowed misses, make-up rules, and pro-rata reward rules within platform limits. Unresolved disputes do not count as confirmed nonperformance. Confirmed nonperformance may proportionally reduce the Moral Trade reliability score after the dispute period; successful appeals reverse that effect. Authorized withdrawal, excused events, and platform-caused failures do not reduce the score.

### 5.6 Attrition and redistribution

The creator may publish an automatic redistribution formula. Each participant separately chooses the maximum total obligation they accept before joining.

An automatic increase is valid only when it:

1. follows the accepted formula;
2. remains within that participant's accepted maximum;
3. leaves the action, evidence standard, performance period, and other material terms unchanged.

A valid automatic increase does not require another confirmation, but the participant is notified immediately and the assignment is added to the durable audit record.

When a shortfall cannot be fully absorbed:

1. redistribute within accepted limits;
2. offer the remaining obligation to eligible waitlisted users;
3. reopen eligible slots under the group's visibility rules;
4. apply the preselected fallback after the recruitment period.

Permitted fallbacks:

- continue at reduced aggregate output with proportionally adjusted group reward;
- preserve earned rewards and end future performance;
- permit remaining participants to withdraw without a reliability penalty;
- terminate the Co-Act;
- create a revised version requiring fresh consent.

State transitions must be explicit:

- `ACTIVE -> REBALANCING -> ACTIVE`;
- `ACTIVE -> REBALANCING -> RECRUITING_REPLACEMENT -> ACTIVE`;
- `ACTIVE -> REBALANCING -> RECRUITING_REPLACEMENT -> FALLBACK_APPLIED`.

The proposal release stores these rules but does not execute them.

## 6. Co-Fund terms

### 6.1 Fixed project and exact allocation

Every Co-Fund identifies one frozen project or deliverable, one settlement target, one deadline, and one destination.

Supported allocation subtypes:

- equal share;
- flexible contribution;
- custom split;
- matching pledge.

All subtypes must end in a frozen allocation whose shares exactly equal the settlement target before the final confirmation window. Substantive project changes create a new version and require fresh consent.

Every participant enters and confirms their own terms:

- private maximum contribution;
- no-pool default;
- whether participation is preferable to that default;
- any compatible payment terms in a later executable release.

The creator cannot enter these terms for another participant. A participating creator may enter only their own terms; an organizer-only creator submits no participant-owned funding terms.

Custom-split allocation may additionally use numerical private values. Private numerical values must not be included in ordinary proposal payloads, logs, analytics, rendered HTML, or participant-visible records. A future allocation service may decrypt them transiently under an audited isolation boundary; ordinary application code must not expose them.

### 6.2 No-pool default

The no-pool default is informational in this proposal release. Any future executable fallback requires a separate participant authorization after the proposal stage.

A future authorized fallback may trigger only after terminal failure, after permitted extensions, waitlist substitution, and reallocation attempts are exhausted. The proposal release must not create, imply, or exercise that authorization.

### 6.3 Confirmation, payment, and failure terms

The final allocation uses a 24-hour unanimous confirmation window.

- Every active participant must affirmatively confirm.
- Silence or rejection counts as refusal.
- The system may use the waitlist or recompute the allocation and begin a new window.
- After three unsuccessful automatic recomputation rounds, the round pauses for creator review or expires.

A payment method may be wallet reservation, card/ACH authorization, or escrow only when technically compatible with the duration, settlement currency, recipient, jurisdiction, and payout policy. The participant chooses among compatible methods.

A future payment-failure bridge may apply only after a participant confirmed and the payment subsequently failed. Policy limits are:

- less than $100 for one failed participant;
- no more than $250 bridged for one Co-Fund;
- verified identity;
- sufficient Moral Trade reliability;
- active repayment authorization;
- no recent repayment default;
- per-user, per-group, and platform reserve limits;
- emergency kill switch.

The creator chooses the disclosed deadline outcome before publication: release reservations, allow one bounded extension, open a new round, or let participants vote. The creator also preselects the linked-trade fallback when the Co-Fund remains under threshold: expiry, a specified alternative offer, or renegotiation. The proposal release records these choices but executes none of them.

The proposal release must not expose a client-controlled path to bridge funding.

Moral Trade's processing-fee promotion is a one-time, platform-wide $250 pool that does not replenish automatically. The proposal release may display disclosed terms only if backed by an authoritative server value; it must not promise or spend the subsidy.

### 6.4 Multi-currency and recurring terms

One destination settlement currency is authoritative. A future executable implementation locks exchange rates when final confirmation begins and restarts confirmation if material movement changes a participant's share.

Recurring Co-Funds may offer either standing authorization or per-cycle confirmation. The initial authorization sets a maximum amount and frequency. Any increase, new destination, or materially changed project requires fresh consent. The proposal release stores no executable mandate.

### 6.5 Payout

Approved charities may receive direct payout after successful activation. Projects or service providers may require milestone-based escrow. These are future execution semantics and remain disabled in the proposal release.

## 7. Relationship to the bilateral trade

Only the offeror and counterparty are parties to the bilateral trade. Co-Act and Co-Fund members sign a linked group participation agreement covering only the terms applicable to them.

A trade containing a group contribution becomes executable only after both:

- final bilateral acceptance; and
- successful group activation.

The proposal release creates neither condition.

Material group terms become immutable when the first other participant joins. Later changes create a new version and require explicit re-consent.

If a linked group does not activate, apply the prepublished fallback: another specified offer alternative, renegotiation, or expiry.

## 8. Persistence and authorization

Persist group terms as normalized, versioned proposal data or as validated nested proposal data where the existing Create contract already provides equivalent durability. Do not add a migration merely to mirror data that is already durably and safely represented.

Server validation must enforce at least:

- supported group mode and subtype;
- contribution-type compatibility;
- participant ceiling from 1 through 100 and selected-target count at or below that ceiling;
- explicit creator participation matching the selected participant list;
- immutable account UUIDs, valid username snapshots, unique account selection, and unresolved legacy free text;
- structured eligibility allowlist;
- exact allocation arithmetic using minor currency units;
- one authoritative settlement currency;
- valid deadlines and confirmation windows;
- accepted redistribution ceilings;
- material-term versioning;
- pending public-mention preferences and terminal-state invitation-only disclosure policy;
- participant-owned terms entered only by the authenticated participant;
- absence of invitee email/phone data, private numerical values, and executable payment authority;
- absence of client-controlled activation, verification, reliability, subsidy, or bridge state;
- idempotent proposal writes;
- participant- and owner-scoped authorization;
- fail-closed handling of unknown fields.

Never trust a generated natural-language summary as the authoritative contract. Generate it from validated structured terms.

## 9. Safety boundaries

Reject or route to review any proposal involving:

- unlawful, violent, deceptive, harassing, coercive, or extortionate conduct;
- threatened harm used to obtain concessions;
- obligations outside a participant's competence or legal eligibility;
- foreseeable material harm to uninvolved parties;
- manufactured baselines or deliberate worsening intended to create apparent additionality;
- unverifiable high-stakes claims presented as verified.

## 10. Required tests

Before leaving draft, the exact candidate must pass:

### Focused contracts

- solo options remain unchanged;
- Co-Act only attaches to nonfinancial options;
- Co-Fund only attaches to funding options;
- participant ceiling and boundaries;
- same-action and complementary-role validation;
- no-minimum and threshold activation terms;
- matching-action `Do this together?` behavior;
- baseline privacy and incremental-credit calculation;
- account autocomplete requiring explicit selection;
- creator participation with neither answer preselected;
- duplicate, blocked, self, and username-less account handling;
- external claim-link targets without email/phone persistence;
- identity timing for invitation-only groups across every terminal state;
- redistribution formula and participant ceilings;
- exact Co-Fund allocation in integer minor units;
- all four Co-Fund subtypes;
- no-pool fallback intent without authorization creation;
- 24-hour unanimous confirmation terms;
- private-value leakage rejection;
- executable-authority and unknown-field rejection;
- idempotent save and resume;
- review-summary determinism.

### Adversarial and persistence checks

- forged participant counts;
- stale-version writes;
- duplicate participation;
- allocation rounding and currency mismatch;
- unauthorized proposal access;
- attempted activation/payment/identity-publication fields;
- oversized or malformed payloads;
- rollback and synthetic-data cleanup;
- RLS/function grants where persistence changes require them.

### Rendered checks

Desktop and narrow-mobile coverage for:

- same-action Co-Act;
- complementary-role Co-Act;
- equal, flexible, custom, and matching Co-Fund;
- public and invitation-only visibility;
- existing-group attachment;
- action-match prompt;
- advanced terms;
- review and save/resume;
- keyboard and screen-reader labels;
- zero page errors, console errors, clipping, and horizontal overflow.

### Absolute release gates

- focused tests;
- complete repository tests;
- ESLint;
- TypeScript;
- production build;
- database/authorization/payment-boundary checks where applicable;
- exact diff inspection;
- exact-head preview verification;
- no unresolved review threads.

After merge, identify the exact merged commit and production deployment, verify canonical routes, and inspect relevant runtime logs before claiming the feature is live or healthy.
