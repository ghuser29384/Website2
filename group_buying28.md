Version note for group_buying28.md: This revision extends group_buying27.md with a second-pass simplification of user-facing UI and copy: concrete action-first labels, one-screen deal cards, two-level detail disclosure, a receipt timeline, copy-lint rules, failure-state message templates, and simplified budget/proposal flows. These changes simplify UX/UI and language without removing or weakening any underlying controls, auditability, privacy, payment, verification, settlement, or compliance requirements.

You are working on the Moral Trade codebase for moraltrade.org. Build a non-MVP “Moral Goods Group-Buying” market/mechanism as a first-class feature, integrated alongside the existing moral-trade / pledge-swap marketplace rather than replacing it.

Context:
- Moral trade means voluntary exchange made possible by differences in moral views or moral/prudential valuations. A canonical case is one person paying another to become vegetarian when the payer morally values animal welfare and the participant values compensation. See the project’s existing moral-trade framing and preserve its “mutual-gain relative to no-trade baseline” invariant.
- This feature should implement group buying for moral goods: many funders conditionally buy a batch of additional, verified moral-impact units from many action-takers.
- Do not build the older simple version “50 people complete → everyone gets paid.” Build the revised mechanism: conditional batch purchase of additional verified impact units.
- This is non-MVP: implement persistent models, user flows, admin controls, verification, settlement calculation, anti-threat controls, and public reporting. Use existing stack conventions after inspecting the repository.

Core concept:
A group-buying round lets funders pledge money to buy a minimum quantity of adjusted moral-impact units. Participants apply to perform a standardized moral action. The platform estimates expected impact before launch, verifies actual behavior after the action window, then settles payments/pledges based on actual adjusted impact units.


Additional core product: crowdfunded pledge-swap lots
The Moral Goods Group Buying feature must also support a **crowdfunded pledge-swap lot**: many funders each authorize a small conditional contribution that together funds the consideration side of a single pledge swap or a small set of equivalent pledge swaps. Example: 100 funders each authorize $0.50 so that, if the lot fully funds and the participant accepts the frozen terms, the platform donates $50 to an admin-approved effective charity after one selected participant completes and verifies a 2-day no-meat action.

This is a first-class group-buying submode, not a replacement for the batch adjusted-impact-unit mechanism. It is for cases where the moral-trade object is naturally “one participant performs one verified action in exchange for one fixed charitable donation / payout / mixed consideration,” and the group-buying value comes from allowing many funders with small budgets to jointly buy that pledge swap. The same infrastructure still applies: immutable snapshots, server-side clearing, payment authorization, donation/payout reserve accounting, verification, settlement line items, auditability, anti-threat controls, public/private reporting, and cross-feature raw-action-unit de-duplication.

Crowdfunded pledge-swap lots must support at least:
- **Donation-consideration pledge swaps:** funders collectively fund a donation to a frozen, admin-approved charity or to a participant-selected charity from an approved list. The participant does not personally receive the donation, but values the charity donation enough to accept the behavior-change obligation.
- **Participant-payout pledge swaps:** funders collectively fund a direct participant payout, subject to all participant-payout, tax, KYC, welfare, and reserve rules already specified.
- **Mixed-consideration pledge swaps:** part charitable donation and part participant payout, if the frozen template, compliance review, and participant-welfare review allow it.
- **Single-participant lots:** one selected participant accepts one action obligation, such as “avoid meat/fish for 2 days.”
- **Small-cohort lots:** several selected participants each accept the same small pledge-swap obligation, only if the lot snapshot specifies the per-participant consideration, capacity, reserve, and selection rules.

For a donation-consideration lot, the participant's validly earned charitable donation must be protected analogously to a participant payout. Before the participant is asked to begin the action, the platform must verify sufficient donation reserve / guarantee capacity under the frozen terms. Later micro-funder capture failures, reversals, expired authorizations, or chargebacks must not reduce a donation validly owed after verification; route shortfalls to the frozen reserve/shortfall policy.

Micro-contributions such as $0.50 must be represented as integer minor units plus explicit currency, e.g. 50 cents in USD. Real payment providers may impose practical minimums or fees that make tiny card authorizations uneconomic. The feature should therefore support provider-minimum policies, batched capture, internal wallet/credit balances where legally supported, sponsor-backed reserves, or a configured minimum micro-pledge amount. The UI must not promise that $0.50 real-money contributions are available in production unless the configured payment/compliance stack supports them.


Additional core product extensions: baskets, standing pools, participant choice, sponsor gap-fill, and private proposal intake
The group-buying system must also support five related subfeatures that make crowdfunded pledge-swap funding practical and safer at scale:

1. **Crowdfunded pledge-swap baskets.** A basket lets funders jointly fund a batch of equivalent pledge-swap lots rather than one isolated lot. Example: 500 people each allocate $0.50, producing $250 that funds five verified pledge swaps; each selected participant completes a 2-day no-meat action, and each verified completion triggers a $50 donation to a vetted effective charity. Baskets should be preferred when feasible because they reduce verification cost per dollar, reduce single-participant privacy risk, smooth participant non-completion risk, and produce more meaningful aggregate public reports.
2. **Standing microfund pools.** A funder can create a reusable constrained micro-budget, e.g. “Allocate up to $5/month to verified animal-welfare pledge swaps, with no more than $0.50 per lot or basket item.” The platform may allocate from that pool only into lots or baskets satisfying the frozen user constraints and platform policies. This solves small-payment overhead by letting users fund once or authorize a periodic budget, then allocate internally through wallet, batching, or provider-supported mechanisms.
3. **Donation-recipient choice for participants.** For donation-consideration pledge swaps, the participant must be able, where the frozen template permits, to choose the charity recipient from a vetted approved list before accepting the obligation. A donation is valid consideration only if the participant accepts that recipient choice as valuable enough for the trade. The selected donation recipient and fallback policy must be frozen before the participant is asked to begin the action.
4. **Last-dollar sponsor matching / gap-fill.** A sponsor may commit to fill the remaining funding gap after a lot or basket reaches a frozen threshold, e.g. “If this lot reaches at least 80% of the $50 target before expiry, the sponsor funds the last 20%.” Gap-fill commitments improve pivotality for small funders but must have explicit reserves, line items, expiration, matching rules, and public-reporting treatment. Sponsor gap-fill must not be counted as separate impact from the same verified action units.
5. **Participant-proposed pledge-swap lots, private until reviewed.** Participants may submit private proposals such as “I would be willing to do X if Y is funded,” but such proposals must enter a private review queue and must not be published directly. Admins may convert safe proposals into standardized, reviewed, frozen lots or baskets. Threat-framed, coercive, illegal, discriminatory, self-harm, medical-risk, baseline-worsening, or off-platform-circumvention proposals must be rejected or routed to safety/risk review.

These subfeatures must preserve the same invariants as the rest of Moral Goods Group Buying: voluntary mutual gain relative to the no-trade baseline, immutable snapshots, participant protection from post-action funder failure, anti-threat controls, aggregate-only funder/participant interaction by default, public/private snapshot separation, deterministic settlement, ledger reconciliation, and cross-feature raw-action-unit de-duplication.


Architectural improvement: shared purchase primitives and capability-gated modules
To prevent the feature from becoming several parallel marketplaces, implement the mechanism as a small set of shared service-layer primitives even if the database uses separate tables for repository fit:
- **Purchase envelope:** GroupBuyRound, CrowdfundedPledgeSwapLot, and CrowdfundedPledgeSwapBasket are different envelopes for buying moral goods, not separate settlement architectures.
- **Funding source:** ordinary funder pledge, micro-pledge, standing microfund allocation, sponsor match, sponsor gap-fill, and platform/dev reserve should all expose a common funding-source interface with authorization, reserve eligibility, capture/release, currency, expiry, and constraint semantics.
- **Consideration obligation:** participant payout, charitable donation, mixed payout/donation, sponsor-funded bonus, and fixed pledge-swap consideration should all produce explicit obligation records before money movement. Settlement should execute obligations rather than re-deriving what is owed from UI state or mutable template fields.
- **Credited action unit:** verified raw action units remain the shared de-duplication and impact-reporting primitive across group-buying, pledge-swap lots, baskets, and existing pledge-swap / moral-trade agreements.
- **Settlement plan:** clearing produces a deterministic plan that binds funding sources, credited action units, consideration obligations, fees/withholding, donation operations, payout operations, releases, and ledger entries under one frozen snapshot hash.
- **Purchase-envelope registry:** every round, lot, basket, and imported pledge-swap agreement should have a shared registry row used by dashboards, deadline jobs, capability gates, public/private serializers, receipts, status steppers, and settlement routing. Envelope-specific tables may store detail, but the registry supplies the authoritative envelope type, currency, status category, public identifier, enabled modules, and frozen policy-bundle reference.
- **Action commitment:** participant obligations should be represented by a shared action-commitment primitive across adjusted-impact rounds, pledge-swap lots, basket items, and existing pledge-swap agreements. ParticipantEnrollment can remain the application/selection record for rounds, but settlement and de-duplication should key off action commitments and credited action units, not only round-specific enrollment rows.
- **Frozen policy bundle:** instead of copying dozens of independent policy JSON blobs without a manifest, freeze a policy bundle made from versioned policy components. The bundle manifest should record component hashes, redaction/public-export status, dependency compatibility, and the exact canonical serialization used for the envelope snapshot. Missing, contradictory, or non-canonical policy components must fail closed before publication, launch, activation, settlement, or public reporting.
- **Authoritative snapshot hierarchy:** the frozen policy bundle and purchase-envelope registry are authoritative for launch, activation, settlement, public reporting, and receipt generation. Table-level `*_snapshot_json` fields may remain for denormalized query convenience, but they must be generated from the canonical bundle/envelope snapshot or explicitly declared as local immutable sub-snapshots. Any mismatch among denormalized snapshot fields, the bundle manifest, the registry row, and settlement-plan hashes must fail closed and create a repair/reconciliation task rather than letting the UI or settlement pick one version implicitly.
- **Domain-event outbox and projection repair:** every state transition that can affect funding, participant obligations, evidence deadlines, receipt generation, notifications, public progress, search/listing visibility, or provider calls should persist a redacted domain event/outbox record in the same transaction as the state change. Notification logs, public progress projections, dashboard steppers, search indexes, and provider-operation jobs should be derived from idempotent outbox consumers or explicitly reconciled repair jobs, not from ad hoc route-side effects.
- **Allocation and rationing policy:** overfunded lots, near-clearing baskets, standing-microfund allocations, sponsor gap-fill triggers, and successor-envelope routing must use a frozen allocation/rationing policy. The policy should specify whether allocation is first-valid, pro-rata, seed-randomized, user-ranked, highest-expected-impact, near-clearing, diversified, or manual-review-based; it must not silently optimize for platform revenue, lower support cost, or favored recipients outside user/funder constraints.
- **Offset and moral-licensing claim controls:** by default, funding a lot, basket, round, or microfund pool must not be framed as offsetting the funder's own harmful behavior or granting moral permission to do something else. Offset-like claims require a separate approved offset methodology, substitution/rebound accounting, funder counterfactual policy, and public copy review.

Feature modules should be separately configurable and feature-gated: adjusted-impact-unit rounds, crowdfunded pledge-swap lots, pledge-swap baskets, standing microfund pools, participant donation-recipient choice, last-dollar sponsor gap-fill, participant-proposal intake, internal wallet/balance support, charitable-donation execution, and production real-money movement. A deployment may enable a safer subset without enabling all modules. Disabled modules must fail closed in UI, API, jobs, settlement, public reporting, and seed data.

Operational-efficiency rule: the system should prefer baskets or batch rounds over isolated low-value single lots when verification, payment, support, or privacy overhead would dominate expected impact. Single pledge-swap lots are still allowed when the frozen methodology/review rationale explains why the lot is useful, such as piloting, participant motivation, unusually high expected impact, or pedagogical clarity.

Further architectural hardening: envelope registry, generic commitments, and staged rollout
Because rounds, lots, baskets, standing pools, and existing pledge-swap agreements can all buy the same underlying moral good, add these additional architecture rules:
- **Purchase-envelope registry:** every round, lot, basket, basket item, and imported pledge-swap agreement should have a registry row with envelope type, envelope id, parent envelope, public identifier, canonical snapshot hash, lifecycle state group, enabled feature modules, and public/private visibility policy. This gives settlement, receipts, reporting, search, and operations a stable cross-envelope reference instead of special-casing every table.
- **Generic funding-source commitment:** FunderPledge, CrowdfundedPledgeSwapMicroPledge, StandingMicrofundAllocation, SponsorMatchingPool, SponsorGapFillCommitment, and platform/dev reserves should each register a FundingSourceCommitment row. Clearing and settlement should consume funding-source commitments through a common interface, then write source-specific records for user dashboards and provider reconciliation.
- **Generic participant-action commitment:** ParticipantEnrollment should remain valid for ordinary group-buying rounds, but lots and baskets need a shared ParticipantActionCommitment primitive that can represent “this participant accepted this frozen action obligation under this envelope.” Verification, credited raw units, payout/donation obligations, withdrawal, disputes, and receipts should attach to this commitment rather than assuming every participant action belongs to a GroupBuyRound enrollment.
- **Generic funding settlement line item:** FunderSettlementLineItem and SponsorSettlementLineItem may remain as compatibility views, but settlement should also create FundingSettlementLineItem rows keyed by funding_source_type/funding_source_id. Micro-pledges, standing-pool allocations, sponsor gap-fill, and ordinary pledges should reconcile through the same settlement-line-item invariant.
- **Envelope-scoped settlement:** Settlement must identify the purchase envelope being settled, not only a round_id. A basket settlement may cover multiple basket items; a lot settlement may cover one ParticipantActionCommitment and one fixed ConsiderationObligation; a round settlement may cover many enrollments. The settlement input hash must include the envelope registry row and frozen envelope snapshot hash.
- **Default anonymous supply-side matching:** public funding should normally attach to a template, lot, basket, or anonymous participant supply pool, not to a named individual. Participant-specific public lots are allowed only when the participant has explicitly opted into the reviewed disclosure policy and the welfare/privacy review accepts the risk. This reduces pressure, harassment, and funder targeting.
- **Participant pre-acceptance versus post-funding invitation:** each lot/basket must freeze whether participants are pre-accepted into a private supply queue before funding opens, or invited only after funding clears. If the participant is invited after funding, the funding lock must expire or roll to another equivalent participant under the frozen replacement policy if the participant declines. If the participant pre-accepts, their acceptance must have an expiry and must not require action until funding, reserve, and launch checks are complete.
- **Canonical envelope state groups:** keep table-specific statuses if useful, but map every envelope to a small public state set: draft/review, funding, funded-awaiting-acceptance, accepted-not-active, active, evidence-due, under-review, settling, completed, released/expired/cancelled, and blocked/paused. Public UI, notifications, and receipts should use these state groups; internal status codes remain admin/debug details.
- **Staged rollout sequence:** implement and enable modules in increasing operational complexity: (1) simulated adjusted-impact rounds; (2) production-gated adjusted-impact rounds without wallet support; (3) crowdfunded lots with provider-minimum-compliant contributions; (4) baskets; (5) standing microfund pools using constrained authorizations; (6) internal-wallet/stored-balance support only after legal/compliance approval. Each stage should have its own production-readiness checklist and cap-increase path.
- **Proportional verification burden:** verification requirements should scale with action risk, payout/donation value, gaming risk, and evidence sensitivity. Low-value lots should not require invasive evidence unless the safety/methodology review explains why the burden is necessary; if adequate verification would be too invasive or too expensive, the system should route the action to a basket, sponsor-backed pilot, or reject it.
- **Donation-recipient freshness:** donation recipient approval, payment destination, sanctions/AML status, charity due-diligence status, and effectiveness-evaluation reference must be current at both obligation lock and donation execution. If approval expires or a recipient becomes blocked, use the frozen participant-approved fallback or cancel before action begins; after a verified action, use the frozen donation-failure/shortfall policy without erasing the earned consideration.


UX/language simplification layer: simple surface, full safeguards underneath
The user-facing product should hide internal architecture while preserving every obligation, control, receipt, and audit invariant. Public, funder, participant, sponsor, and support screens should be designed around user intent and next action, not around database objects or policy-module names.

User-facing product labels:
- Use concrete action-first labels whenever possible, such as **Fund two meat-free days**, **Fund five verified actions**, or **Help this project clear**, instead of leading with mechanism names.
- Use **Fund many verified actions** for large batch purchases of verified adjusted impact units.
- Use **Fund one verified action** for a single crowdfunded pledge-swap lot. A secondary detail line may say “pledge-swap lot” for users who want the mechanism label.
- Use **Fund several similar actions** for a batch of similar pledge swaps. A secondary detail line may say “basket.”
- Use **Set a small recurring budget** for standing microfund pools.
- Use **Sponsor remaining funding** for last-dollar sponsor matching or gap-fill.
- Use **Suggest an action privately** for participant-proposed lots before review.
- Keep **Moral Goods Group Buying** as the feature name in navigation, terms, receipts, and help pages, but do not force ordinary users to understand that label before they can fund, apply, or view results.
- Do not use internal terms such as purchase envelope, consideration obligation, funding-source commitment, policy bundle, outbox, projection, raw-unit key, HMAC, settlement plan, activation effect, or lifecycle state in ordinary public/funder/participant UI. Those terms may appear in developer docs, admin debug views, audit exports, and reviewer tools.

Role-based entry points:
- The main Moral Goods Group Buying page should start with four plain choices: **Fund verified actions**, **Apply to participate**, **Set a small recurring budget**, and **View results**.
- A secondary entry point may say **Suggest a private proposal** when participant-proposal intake is enabled.
- Admin/reviewer/operations entry points should be separate from public/funder/participant flows and may expose technical checklists.
- Each user-facing page should have one primary next action where feasible. Secondary actions such as receipt download, methodology details, dispute, withdrawal, or support should remain available but visually secondary.

Progressive disclosure:
- Default public cards should show only: action, consideration/payment, verification level, deadline/status, and expected impact range or fixed pledge-swap terms.
- Expandable sections should provide methodology, funder constraints, donation-recipient policy, fees, tax/donation limitations, privacy, dispute rules, and snapshot/hash details.
- Advanced detail must remain accessible before commitment, but users should not need to read internal policy JSON or lifecycle codes to understand what they are doing.
- Public reports should begin with a plain summary, then offer detailed tabs for methodology, funding, verification, settlement, limitations, and receipts/public snapshot identifiers.

Canonical user-facing state labels:
| Internal state group | User-facing label | Required clarification |
|---|---|---|
| draft/review | Not open yet | The round/lot/basket is still being reviewed. |
| funding | Open for funding | Money is authorized or allocated under frozen terms, not necessarily charged. |
| funded-awaiting-acceptance | Funded; waiting for participant acceptance | No participant action should begin yet. |
| accepted-not-active | Ready to start soon | Required reserve, compliance, and timing checks are still enforced. |
| active | Action in progress | Participant should follow the frozen action instructions. |
| evidence-due | Proof due | Evidence/check-in deadline and grace rules must be visible. |
| under-review | Proof under review | No final payout/donation/impact claim yet. |
| settling | Settling payment or donation | Line items are being finalized/executed. |
| completed | Complete | Show verified outcome, paid/donated/charged/released status, and receipts. |
| released/expired/cancelled | Released, expired, or cancelled | Explain what happened to authorizations, allocations, and participant obligations. |
| blocked/paused | Paused | Explain safe actions still available, such as withdrawal, dispute, support, or required release/refund. |

Plain-language commitment cards:
Every pledge, micro-pledge, standing-budget setup, participant application, team join, charity-choice, evidence submission, withdrawal, payout-destination, and dispute flow should end with a short confirmation card using the same order:
1. **What you are agreeing to.** Example: “You may fund up to $0.50 of this pledge-swap basket.”
2. **When money or action starts.** Example: “Your card is authorized now; it is charged only if this basket clears and settles under the frozen rules.”
3. **What can still fail or change.** Example: “If the basket expires, your authorization is released. If the participant does not verify the action, the donation is not executed unless the frozen cancellation policy says otherwise.”
4. **Your deadlines and rights.** Example: cancellation, withdrawal, evidence, dispute, reauthorization, or support deadlines.
5. **Your receipt.** Example: where to find the durable receipt and frozen snapshot identifier.

Terminology rules for safer simple copy:
- Say **authorized** when money is only authorized; say **charged** only after capture succeeds; say **released** only after the release is recorded.
- Say **estimated verified impact** or **adjusted impact units under this protocol** rather than “impact” when uncertainty matters.
- Say **donation owed if the action is verified** rather than “guaranteed donation” before verification, unless the frozen cancellation policy truly guarantees it.
- Say **selected to participate** separately from **eligible**, **team activated**, **fully funded**, **active**, **verified**, and **paid/donated**.
- Say **private proposal under review** rather than “listed” or “available for funding” before admin approval.
- Say **charity chosen from the approved list** rather than implying the participant or funder can direct money to any organization.
- Avoid moral-licensing phrasing such as “offset your eating” or “cancel out harm” unless the envelope is an approved offset product.

Simplified funder UX:
- A funder should be able to start with amount, cause/action filters, maximum per lot/basket, refund/release preference, and optional charity-recipient scope.
- Standing microfund setup should use a simple budget builder: monthly cap, per-action cap, allowed action types, allowed consideration types, recipient scope, and allocation review mode: **automatic within my rules**, **show me before locking**, or **manual only**.
- Allocation receipts should say why the money was routed, e.g. “Matched your animal-welfare/no-meat rules and was closest to clearing.”
- Funder dashboards should group items by simple status: active authorizations, allocated budgets, charged items, releases, rollovers, and completed results.

Simplified participant UX:
- Participant onboarding should follow a short path: eligibility, baseline, consideration/charity choice, terms, wait for selection/start, action instructions, evidence, result, payout/donation status.
- The participant dashboard should always show one prominent next instruction, especially **Do not start yet**, **Start now**, **Submit proof**, **Wait for review**, **Dispute by [date]**, or **Payout/donation complete**.
- Withdrawal should be visible from active participant dashboards and should explain payment/donation consequences without asking for unnecessary private health or safety details.
- Evidence requests should explain the minimum acceptable evidence, what not to upload, privacy redaction tips, and whether light verification or stronger review applies.

Simplified admin/reviewer UX:
- Admins should see checklists and blockers before raw policy JSON: publication readiness, launch readiness, reserve readiness, evidence readiness, settlement readiness, and public-report readiness.
- The round/lot/basket builder should use presets for common safe templates, then reveal advanced policy fields only when needed.
- Public/private snapshot preview should be a diff-like view: “users will see this” versus “private policy retained for audit.”
- Reviewer queues should show minimized/blinded facts first, then gated access to sensitive details with reason logging.
- Operations dashboards should group alerts by action required: retry safe job, review blocked payment, extend deadline, inspect evidence quarantine, reconcile ledger, or pause/unpause.

Comprehension without friction:
- Use lightweight confirmation only where risk justifies it: stored-balance-like flows, real-money production commitments, participant-identified lots, donation-tax limitations, high-burden evidence, or unusual cancellation rules.
- The check should confirm understanding of money state, action timing, evidence, privacy, refund/release, and tax/donation limitations. It must not be used to discourage withdrawal, disputes, or cancellation rights.

Second-pass UX/language simplification: one-screen common cases
For ordinary users, the simplest successful path should fit on one screen or one modal whenever the frozen policy permits it. All advanced details must remain accessible before commitment, but the first screen should answer only the user’s immediate questions: **What am I funding or doing? What happens next? What can go wrong?**

Concrete deal card pattern:
Every public round, single-action lot, basket, and standing-budget allocation should render from one shared “deal card” component with these visible rows in this order:
1. **Action:** a concrete verb phrase, e.g. “One adult participant avoids meat/fish for 2 days.”
2. **Consideration:** e.g. “$50 donation to a charity the participant chose from the approved list,” “up to $60 participant payout,” or “mixed payout and donation.”
3. **Your role:** e.g. “You may fund up to $0.50,” “You may apply to participate,” or “You may sponsor the remaining $10.”
4. **Status:** one of the canonical user-facing labels, not an internal status code.
5. **Next step:** one primary button, such as **Fund this**, **Apply**, **Choose charity**, **Submit proof**, **Review allocation**, **Download receipt**, or **View results**.
6. **If it does not complete:** one plain sentence explaining release, expiry, replacement, rollover, or cancellation behavior.
7. **Details:** one expandable link for methodology, fees, privacy, verification, dispute, donation/tax limits, and snapshot identifiers.

Two-level explanation rule:
- Level 1 copy is for ordinary users and should avoid formulas, internal object names, and nested policy conditions. It should use short sentences and concrete nouns.
- Level 2 copy is the expandable “Details” layer and may show formulas, methodology, precise deadlines, verification standards, fees, tax/donation limits, and snapshot identifiers.
- Level 3 copy is admin/developer/audit documentation and may use internal architecture terms, policy-bundle names, canonical hashes, ledger account types, and state-machine details.
- Users must be able to access Level 2 before committing, but they should not have to read Level 2 or Level 3 to know what action, money state, evidence obligation, deadline, and failure behavior applies to them.

Formula presentation rule:
The adjusted-impact formula must remain available in methodology and public-report details, but ordinary pledge/application cards should summarize it in plain language first: “We estimate verified impact from the action completed, how likely it was additional, how strong the evidence is, and the frozen impact methodology.” Do not place the full multiplication formula above the primary CTA unless the user opens methodology details or the page is explicitly an advanced methodology/report view.

Plain-language status sentence templates:
- **Open for funding:** “You can authorize money now. You are charged only if this clears and settles under the frozen rules.”
- **Funded; waiting for participant acceptance:** “Funding is ready. The participant has not been asked to start yet.”
- **Ready to start soon:** “The project passed funding and reserve checks. The participant should wait for the start notice.”
- **Action in progress:** “The participant should follow the action instructions now.”
- **Proof due:** “Proof is due by [date/time]. Late proof follows the listed grace and dispute rules.”
- **Proof under review:** “Review is not final yet. No payout, donation, or impact claim is final.”
- **Settling payment or donation:** “Charges, releases, payouts, and donations are being finalized from the approved settlement.”
- **Complete:** “Verified result, money movement, releases, and receipts are available.”
- **Released, expired, or cancelled:** “No new action is required. See what happened to money, obligations, and receipts.”
- **Paused:** “This is paused. Safe actions still available: [withdrawal/support/dispute/required release/refund as applicable].”

Simplified navigation:
- The public feature landing page should have three main tabs: **Fund**, **Participate**, and **Results**. **Set a recurring budget** can appear as a prominent card under Fund. **Suggest an action privately** can appear under Participate when enabled.
- A funder dashboard should group records into **Needs your review**, **Authorized**, **Charged**, **Released**, **Recurring budgets**, and **Completed results**.
- A participant dashboard should group records into **Do not start yet**, **Action in progress**, **Proof due**, **Under review**, **Dispute or appeal**, and **Complete**.
- A support/receipt page should show one chronological timeline per user-facing commitment, combining terms acceptance, authorization/allocation, selection/activation, evidence, verification, settlement, charge/release/donation/payout, dispute windows, and receipts. Underlying records remain separate for audit; the user sees one timeline.

Simplified standing-budget setup:
Standing microfund setup should default to a guided preset flow:
1. Choose a cause/action area.
2. Choose a monthly cap.
3. Choose a maximum per action or basket item.
4. Choose allowed consideration types: participant payout, charity donation, or mixed.
5. Choose allowed recipient scope if charity donations are enabled.
6. Choose allocation review mode: **automatic within my rules**, **ask me before locking**, or **manual only**.
Advanced constraints such as verification standard, jurisdiction, additionality class, and fee-ratio caps should appear in an optional “More controls” section with safe defaults.

Simplified participant proposal intake:
The private proposal form should ask for only five ordinary-language fields first: **what you would do**, **how long it would last**, **what consideration would make it worthwhile**, **which approved charity or payout option you would accept**, and **any safety or access concerns**. The form should then explain: “This is private until reviewed. Submitting it does not list it for funding and does not create an obligation.” Risk, anti-threat, baseline, eligibility, and compliance fields may be collected in later private review steps.

Copy-lint rules for ordinary UI:
- Prefer “fund,” “apply,” “proof,” “charged,” “released,” “paid,” “donated,” and “receipt” over abstract nouns such as pledge validity, activation effect, settlement execution, or consideration obligation.
- Avoid more than one parenthetical phrase per paragraph in ordinary user copy.
- Avoid double negatives and stacked conditionals; split them into “When this happens…” and “If this does not happen…” sentences.
- Show exact amounts and dates before policy names.
- Use “you” only for the current user’s own obligations, not for other participants, funders, reviewers, or sponsors.
- Do not say “everyone,” “guaranteed,” “impact,” “confirmed,” “selected,” “owed,” “paid,” or “donated” unless the server-side state and frozen policy make that statement true.
- Every public card and commitment card should be understandable without color, animation, hover text, or icon-only labels.

Failure and edge-case copy should be prewritten:
Create reusable, reviewed message templates for failed funding, expired team activation, participant decline, waitlist/control assignment, participant withdrawal, verification failure, late proof, payment reauthorization, donation-recipient fallback, donation failure after verification, payout hold, operational pause, settlement delay, and public-report suppression. Templates should be non-blaming, non-sensitive, and specific about money/action/receipt consequences.

Simple copy must be generated from server state:
Do not maintain separate hand-written “simple status” text that can drift from state-machine and settlement records. User-facing labels, timelines, cards, notifications, and receipt summaries should be generated from the purchase-envelope registry, action commitments, funding-source commitments, consideration obligations, settlement plan, and receipt records through tested presenter/serializer functions.





Use this formula throughout:

Adjusted Impact Units =
raw action units
× P(additional)
× verification confidence
× moral impact weight
× persistence multiplier

Example:
For a vegetarian challenge, a raw action unit may be “one avoided meat/fish meal” or “one vegetarian day adjusted by baseline meat/fish meals.” A participant with higher baseline meat consumption should generate more expected units than someone who rarely ate meat.

Important design rule:
Participant payout should mostly depend on that participant’s own verified adjusted impact units, not on whether other participants complete. Funders may set group thresholds, but individual participants should not bear group-level attrition risk.

Impact-accounting separation:
The product must keep three accounting layers distinct:
- **Consideration accounting:** what the participant or donation recipient is owed under the frozen trade, such as a fixed $50 donation, a direct payout, or a capped per-unit payout.
- **Protocol impact accounting:** verified raw units and adjusted impact units under the frozen methodology.
- **Net-impact claims:** optional, aggregate, uncertainty-qualified claims relative to the no-trade baseline and funder counterfactuals.
A fixed-consideration pledge-swap lot should not be treated as if the $50 donation is automatically a unit price for impact unless the frozen methodology explicitly defines that conversion. Settlement may execute fixed consideration while public reporting separately reports verified adjusted units and limitations.

Group-buy validity modes:
This feature must explicitly support two moral-goods group-buying validity modes, analogous to consumer group-buying systems:

1. **Instant-valid / single-buyer-valid mode**: an eligible funder pledge, sponsor contribution, or participant enrollment can become valid without recruiting a co-buyer or co-participant. It may still be subject to ordinary round-level launch, reserve, compliance, and verification rules. This mode is appropriate when liquidity is already high, a sponsor or standing budget makes the action independently worth buying, or extra invitation friction would reduce participation more than it increases coordination.

2. **Team-threshold / co-buyer-valid mode**: an individual pledge or enrollment first enters a pending team-activation state and becomes valid only if the configured number of co-funders, co-participants, or both join the same activation group within the frozen activation window. This mode is appropriate when social proof, local pivotality, viral distribution, or cohort support is part of what makes participation likely. The threshold must be evaluated before the relevant obligation begins; it must not make an already-activated participant’s post-action payout depend on later group behavior.

Implications of this distinction:
- Validity mode is a product/mechanism choice, not just UI copy. It affects clearing, reserve accounting, payment authorization handling, expiration jobs, notifications, anti-Sybil controls, public reporting, and user expectations.
- Pending team-threshold pledges or enrollments must not count toward participant-payout reserve, launch solvency, expected adjusted units, public “activated” progress, settlement, or participant selection until the activation group succeeds.
- If a team-threshold activation group expires before satisfying its threshold, pending authorizations are released, pending enrollments are marked expired/not selected, no one is asked to perform the action, and the public/user-facing explanation must be non-sensitive.
- Team-threshold mode increases social proof and pivotality but also increases fraud, collusion, pressure, privacy, and deadline complexity. It therefore requires stronger Sybil checks, invitation abuse controls, aggregate-only participant visibility, idempotent expiration, and separate reporting of instant-valid vs team-threshold outcomes.
- Instant-valid mode is lower-friction and should be the default for sponsor-backed, high-liquidity, low-risk, or operationally mature rounds; team-threshold mode should be used only when the frozen methodology or product rationale explains why co-purchase activation improves participation, additionality, or coordination.
- Team activation success must have frozen semantics. It can make commitments eligible for later clearing, reserve capacity/budget until launch, or immediately select/confirm commitments only if all capacity, reserve, authorization, and compliance checks are clear. User-facing copy must distinguish “team threshold met” from “selected,” “confirmed,” or “owed,” unless the frozen policy actually reserves the relevant slot and payout budget.

Non-negotiable implementation rules:
- Freeze the action template, impact formula, pricing terms, verification standard, funder constraints, matching rules, and public copy into an immutable round snapshot before launch. Later edits to an ActionTemplate or admin settings must not retroactively change participant obligations, funder obligations, verification standards, or settlement calculations for an already-launched round.
- Store money amounts as integer minor units plus explicit currency. Do not use floating-point values for money. Store probabilities and weights in bounded decimal types and validate ranges.
- Settlement execution must be idempotent and auditable. Retrying a failed settlement job must not double-charge funders, double-release authorizations, or double-pay participants.
- Core money-movement, ledger, credited-action-unit, payment-state-machine, lifecycle-state-machine, public/private-snapshot, and settlement invariants should be covered by property-based or fuzz tests where the repository supports them; otherwise use deterministic invariant test matrices that exercise random-looking interleavings, retries, stale events, disputes, holds, and repair operations.
- Persist per-participant and per-pledge settlement line items before money movement. Aggregate Settlement totals are not sufficient for auditability, dispute resolution, or funder/participant dashboards.
- Launch, clearing, settlement approval, and settlement execution must be concurrency-safe. Use database transactions, row locks, optimistic concurrency checks, or the repository’s equivalent pattern so two admins/jobs cannot launch, settle, charge, release, or pay the same round twice.
- Treat baseline answers, verification evidence, payment references, payout details, and anti-threat/fraud flags as sensitive private data with least-privilege access, access logging, and a retention/deletion policy.
- Public reports must suppress, coarsen, or aggregate small cells where raw counts or subgroup statistics could reveal sensitive participant behavior or identity.
- Use a single currency per round unless an explicit foreign-exchange module exists with provider, rate, timestamp, spread/fee, and rounding snapshots. Do not silently mix currencies in clearing or settlement.
- Do not credit or pay for the same raw action unit in more than one paid round. Overlapping enrollments for the same participant/action template/action window must be detected, blocked, or explicitly de-duplicated before launch and settlement.
- Cross-feature double counting must also be prevented. If the existing pledge-swap / moral-trade marketplace can compensate or verify the same participant action, group-buying must use a shared raw-action-unit registry or adapter so the same participant/action/window cannot be paid or credited once through a pledge swap and again through a group-buying round.
- Cross-feature raw-action-unit registry migrations and backfills must be safe, idempotent, and auditable. Before enforcing de-duplication against existing pledge-swap / moral-trade agreements in production, run dry-run backfills, produce reconciliation reports, preserve rollback/repair options, and fail closed on unresolved migration or reconciliation errors.
- Protect selected participants from funder-side post-action threshold failure. Before a round becomes active, create or verify a participant-payout reserve sufficient to cover the maximum participant payout obligation under the frozen terms. Pledges or matching funds with settlement-stage conditions must not be counted toward this reserve unless those conditions cannot reduce payment owed for verified participant units.
- Protect selected crowdfunded pledge-swap participants from funder-side post-action funding failure. For donation-consideration pledge-swap lots, create or verify a charitable-donation reserve, guarantee, or equivalent support sufficient to satisfy the fixed donation obligation before the participant is asked to begin the action. Micro-pledges with settlement-stage conditions must not be counted toward this guarantee unless those conditions cannot reduce the donation owed for verified participant action.
- Crowdfunded pledge-swap lots must not become user-generated threat markets. Users may propose a lot only through a reviewed/admin-approved template and safety process; the platform must reject or flag “pay me or I will do harm,” baseline-worsening, coercive, illegal, discriminatory, self-harm, medical-risk, political vote-buying, or off-platform side-payment variants.
- Donation-consideration pledge-swap lots must use admin-approved donation recipients, frozen donation-destination snapshots, donation-operation line items, and receipt/reconciliation records. A participant-selected charity is allowed only from an approved list under the frozen methodology/compliance policy.
- Funder consent to donation-recipient scope must be explicit. If a lot or basket allows participant donation-recipient choice, each direct micro-pledge, standing microfund pool, and sponsor gap-fill commitment must freeze the recipient list, cause-area scope, or recipient-selection policy the funder accepted. A participant-selected recipient outside a funder’s accepted constraints must exclude/release that funding source rather than silently redirecting it or overriding the participant’s choice.
- Charitable-donation lots and baskets must freeze a donor-of-record, tax-receipt, restricted-fund, and donation-failure policy before funding opens. The UI must not imply that micro-funders receive personal tax deductibility, legal donation receipts, or charity-directed control unless the configured charitable-donation stack supports that treatment.
- Internal wallet, stored balance, or credit-pool support for standing microfunds must be feature-gated and legally/compliance reviewed as potential custody, money-transmission, stored-value, or unclaimed-property infrastructure. If compliant wallet support does not exist, implement standing microfunds as constrained payment authorizations or allocation preferences rather than as user-held stored balances.
- Apply an operational-efficiency floor before publishing isolated single pledge-swap lots. If expected payment, verification, support, privacy, or review overhead is too high relative to expected impact, the lot should be batched into a basket, sponsor-backed pilot, or ordinary group-buying round unless an explicit reviewer-approved rationale is frozen.
- Implement shared ConsiderationObligation / FundingSource / PurchaseEnvelope service primitives so rounds, lots, baskets, sponsor gap-fill, standing-pool allocations, charitable donations, and participant payouts do not develop inconsistent clearing, reserve, settlement, receipt, or public-reporting semantics.
- Treat denormalized public progress, cached funding totals, dashboard state, search/listing indexes, and notification status as projections. They must never be authoritative for activation, allocation, reserve sufficiency, settlement, donation execution, or payout execution; recompute or reconcile from registry, funding-source, action-commitment, ledger, and settlement-plan records before material consequences.
- Public progress for privacy-sensitive envelopes, especially single-participant lots and small baskets, should be coarsened, delayed, or bucketed under the frozen public-progress-suppression policy when real-time updates could reveal participant acceptance, withdrawal, verification status, private charity choice, or funder behavior. Funders may still see their own receipts and financial status.
- Overfunding and oversubscription must be resolved by the frozen allocation/rationing policy before money movement. If more micro-pledges or standing-pool allocations are eligible than the lot/basket needs, the system must deterministically accept, partially accept, queue, reroute, or release funds according to that policy and generate user-visible allocation/release receipts.
- Standing microfund allocation algorithms must be auditable and user-constrained. They may trade off near-clearing probability, expected adjusted units, diversification, verification strength, fee ratio, recipient constraints, and user-ranked preferences only under the frozen pool policy; they must not route funds based on platform fee revenue, undisclosed sponsorship preferences, or hidden recipient promotion.
- Public and transactional copy must not describe a funding action as an offset, indulgence, moral license, or permission to perform another harmful action unless the envelope is explicitly an approved offset template with frozen methodology and public-reporting safeguards. Default copy should say “fund verified actions” or “fund pledge-swap consideration,” not “cancel out your own behavior.”
- For high-risk, high-burden, high-value, stored-balance, participant-identified, or legally complex flows, require a lightweight comprehension confirmation or teach-back step under the frozen comprehension policy. The check should confirm the user understands who may be charged or paid/donated, when obligations begin, whether the participant is public or anonymous, refund/release rules, evidence obligations, and tax/donation limitations. Do not use manipulative quizzes to discourage withdrawal or disputes.
- Persist a shared purchase-envelope registry row for every round, lot, basket, and imported pledge-swap agreement. The registry row, not route-specific UI state, should drive public listings, dashboard steppers, deadline jobs, feature-capability checks, support lookup, and settlement routing.
- Persist shared ParticipantActionCommitment records before asking a participant to act. Every selected participant action in a round, lot, basket item, or existing pledge-swap agreement should map to one or more action commitments, and settlement should consume credited units attached to those commitments rather than relying on a round-specific ParticipantEnrollment alone.
- Freeze policy bundles from versioned components and reference the bundle from every purchase envelope and settlement plan. Do not allow an envelope to launch, activate, settle, or publish a public report if required policy components are missing, have incompatible versions, or have hashes that do not match the canonical bundle manifest.
- Persist an explicit SettlementPlan before any approval or execution step. The plan should bind purchase envelopes, eligible funding sources, recipient constraints, credited action units, consideration obligations, fee/withholding lines, donation/payout/release operations, and ledger entries; approval and execution must reference the same plan hash.
- Feature modules must declare dependency and incompatibility constraints. For example, standing microfund pools that use stored balances depend on compliant wallet/balance support; participant-selected charitable donation lots depend on charitable-donation execution, recipient due diligence, and funder recipient-scope consent; production money movement depends on production payment/compliance gates. A module may be enabled only when prerequisites are satisfied or explicitly waived in development-only mode.
- Apply fee and operational-burden proportionality. Each round, lot, basket, and standing-pool allocation policy should freeze maximum provider-fee ratio, maximum estimated verification/review burden, expected operator-support cost, and reviewer-approved exceptions. If payment fees, evidence burden, review minutes, or support costs would dominate expected impact or consideration value, the system should batch, route to a basket, raise the minimum contribution, use sponsor-backed reserves, reduce evidence burden under a frozen audit policy, or block publication.
- Verification strength should scale with payout/consideration size, fraud risk, public-reporting use, and action risk. Low-value lots may use lightweight attestations plus randomized or risk-triggered audits only if the methodology, funder terms, participant terms, and public reporting disclose the weaker verification standard. Higher-stakes or higher-risk lots require stronger evidence and review.
- Direct micro-pledges and standing microfund allocations may be routed toward near-clearing lots, baskets, or successor envelopes only within the funder's frozen constraints and refund/rollover preferences. Routing decisions should be recorded with a concise user-visible explanation, such as “allocated to this basket because it matched your animal-welfare/no-meat constraints and was closest to clearing.”
- Every purchase envelope should persist pre-launch forecasts for funding probability, participant acceptance probability, completion probability, raw units, adjusted units, verification confidence, payment fees, operational cost, and public-reporting uncertainty. After settlement, calibration jobs should compare forecasts to actual outcomes and produce versioned methodology-update proposals. Calibration may update future priors only through reviewed methodology changes; it must not retroactively alter frozen obligations, participant payouts, charitable donations, or funder charges.
- Public, funder, and participant screens should state expected impact ranges, not just point estimates. Where the mechanism uses additionality priors, light verification, sponsor gap-fill, or participant-selected donation recipients, the UI should show a plain-language uncertainty note and link to the frozen methodology summary.

- Crowdfunded pledge-swap baskets must be first-class clearing and settlement objects. A basket may contain several homogeneous or explicitly equivalent pledge-swap items, each with frozen action obligations, consideration amounts, participant-selection rules, verification rules, reserve rules, and fallback behavior. Baskets must report aggregate outcomes and must not expose individual participant identities, private charity choices, or individual micro-funder behavior unless a reviewed policy explicitly permits it.
- Standing microfund pools must be explicitly authorized by the funder, bounded by frozen per-period and per-lot/per-basket caps, revocable for future allocations, and auditable through allocation receipts. The platform must not allocate a standing pool into a lot, basket, cause area, consideration type, jurisdiction, or recipient class outside the funder's frozen constraints. A pool allocation is not a donation, charge, or pledge-swap purchase until the server creates the corresponding authorized allocation/micro-pledge record.
- Participant donation-recipient choice must be frozen before action begins. If the selected charity becomes unsupported, blocked, or technically unable to receive funds before the participant acts, the participant must be offered the frozen fallback choices or the lot/basket must be cancelled before action begins. If the participant has already validly verified the action, donation failure is handled through the frozen donation failure/shortfall policy and must not erase the earned consideration.
- Last-dollar sponsor matching must have a frozen threshold, maximum amount, expiration time, reserve status, eligible lot/basket scope, sponsor terms acceptance, and settlement line items. Sponsor gap-fill funds may count toward participant/donation guarantees only if the frozen terms and ledger reserve make them non-reducible after the participant acts. Sponsor matching must not be presented as additional impact separate from the same verified action.
- Participant-proposed pledge-swap lots must remain private until reviewed and standardized. Raw user proposal text must be sanitized, access-controlled, risk-reviewed, and excluded from public pages, search, analytics, and funder dashboards by default. A proposal creates no obligation for the participant, funders, sponsors, or the platform until converted into an approved lot/basket and accepted through frozen terms.
- Group-buy validity mode must be explicit, frozen, and enforced server-side. Support instant_valid / single-buyer-valid rounds and team_threshold / co-buyer-valid rounds. Team thresholds may gate pledge validity, enrollment validity, cohort activation, or round launch before action begins, but they must not create post-action group-level payout risk for activated selected participants. Pending team-threshold commitments must be excluded from reserve, clearing, launch solvency, and settlement until activated.
- Team-threshold activation counts must be based on distinct qualified natural persons or approved organizational funders under the frozen policy. A single natural person, duplicate account, duplicate payout destination, related-party cluster, reused payment instrument, or invite alias must not satisfy multiple co-buyer/co-participant slots unless an explicit reviewed policy permits that edge case.
- Team invitations must use non-enumerable, revocable, expiring server-side tokens stored only as hashes or protected references. Raw invite tokens must not be stored in ordinary database columns, logs, analytics, public pages, or admin lists; invite creation, joining, revocation, expiry, and abuse reports must be auditable and rate-limited.
- Team activation must not create ambiguous capacity promises. If activation reserves participant slots, payout budget, or funder capacity, that reservation must be atomic, time-limited, ledger/reconciliation-aware, and released on expiry/cancellation. If activation only grants eligibility for later clearing, the UI must say “team activated, awaiting round selection/launch” rather than “confirmed.”
- Team activation counters, progress bars, and cached qualified-member counts are not authoritative. Activation must be based on transactional TeamActivationMember / pledge / enrollment / risk-review state under locks or equivalent concurrency control, and cached counts must be recomputed or reconciled before threshold success, expiry, launch, clearing, or public reporting.
- Team-threshold UX must not use coercive leaderboards, public shame lists, member rankings, invite-pressure copy, or identity-revealing social proof unless a specific reviewed policy permits it. Use neutral copy, private invitations, report/block controls, and aggregate counts by default.
- Waitlist/control use must be transparent and consented. Do not deceive applicants, and do not ask waitlist/control participants to perform unpaid actions as if they were selected paid participants.
- Waitlist/control and follow-up data may be used for ordinary round administration under the frozen participant terms. Any research, publication, model training, cross-round product analytics beyond ordinary administration, or external sharing of control/follow-up data must require a frozen data-use policy, minimization, consent or other approved basis, and private/public reporting safeguards.
- Verifiers, reviewers, admins, and sponsors with a material conflict of interest must not make final eligibility, verification, dispute, or settlement decisions for their own enrollments, pledges, payouts, matching pools, or closely related users.
- Eligibility, verification, risk, and adverse-decision review queues should blind or minimize participant identity, funder/sponsor identity, payout size, and other biasing context where feasible. High-risk decisions and a configurable sample of ordinary decisions should receive second-review, calibration, or quality-audit checks so reviewer drift, inconsistency, or bias can be detected and corrected.
- Real-money authorization, capture, payout, refund, rollover, or matching execution must be feature-gated. The simulated payment provider must never be usable for production money movement, and public real-money rounds must be disabled unless payment provider, webhook handling, compliance, privacy, support, and dispute workflows are configured.
- Freeze participant-facing and funder-facing deadlines into the round snapshot, including verification submission deadlines, dispute windows, reauthorization deadlines, expected settlement timing, and expected payout timing. Admins may not shorten these deadlines after launch except through the frozen cancellation/safety policy.
- Terms acceptance for participants, funders, sponsors, and admins must be evidenced by immutable server-side acceptance records that reference the frozen terms/snapshot hash, actor, role, accepted version, timestamp, and redacted request context. Timestamp fields alone are not sufficient for production disputes, compliance review, or user-facing proof of consent.
- Users must be able to view or download durable, redacted receipts/proofs for their own material commitments and outcomes, including terms accepted, pledge authorization/release/charge, enrollment/selection/activation status, evidence submission, verification decision, settlement line items, payout attempts, and dispute/appeal deadlines. Receipts must reference frozen snapshot hashes and user-visible identifiers without exposing private policy snapshots, other users’ data, or sensitive internal hashes.
- Revocation, withdrawal, or replacement of terms acceptance must be handled through explicit domain flows such as participant withdrawal, pledge cancellation, payout-destination replacement, dispute resolution, privacy erasure, or admin repair. It must not mutate or delete the original TermsAcceptance proof, and it must not retroactively void obligations or permissions that were validly incurred under the frozen terms before the effective revocation point.
- Public, funder-facing, and internal reporting must preserve the moral-trade no-trade-baseline invariant. Reports should distinguish verified adjusted units purchased under the protocol from net social impact, and should use aggregate funder-side counterfactual information where available so the platform does not imply that all purchased units are fully additional relative to funders’ alternative moral spending. Funder counterfactual notes must be optional or policy-bounded, private by default, and reported only in aggregated/suppressed form.
- Notify users about lifecycle events that affect obligations, evidence deadlines, payment authorization, disputes, settlement, payout, cancellation, or reauthorization. Notifications must not include private evidence, sensitive baseline details, payment references, or fraud/safety notes.
- Appeal and dispute windows for adverse decisions should start from a server-recorded participant/funder-visible decision time, not merely from a private reviewer timestamp. If required in-product notice or transactional notification creation fails, the relevant deadline must be held, extended, or routed to support under the frozen policy rather than silently expiring before the affected user could reasonably see the decision.
- Non-critical notification channels must respect user notification preferences and jurisdictional consent rules. Critical transactional, safety, legal/compliance, payout, deadline, and dispute notices may still be sent through the minimum necessary reliable channels under the frozen notification policy, with opt-out limits clearly disclosed.
- Use privacy-minimized identity, Sybil, and fraud-risk checks for paid participation and payout eligibility. A paid round must not allow one natural person to receive duplicate credit through multiple accounts, duplicate payout destinations, or coordinated evidence fraud.
- Participant payouts validly owed under the frozen terms must not be clawed back from participants because a funder payment later fails, expires, reverses, or is charged back. Route post-settlement payment shortfalls to the frozen reserve/shortfall policy, platform operations, or compliance review.
- Participant payout destinations must be verified and snapshotted before payout execution. Changing a payout destination after settlement approval, during a payout hold, or during a dispute/compliance review must require re-verification and risk review. Failed, abandoned, or unclaimed payouts must follow a frozen retry/hold/expiry policy and must not be silently cancelled, redirected, or converted into platform funds.
- Unclaimed, abandoned, or expired payout balances and unreleased user funds must follow a frozen unclaimed-property/escheatment or legally reviewed abandonment policy for the supported jurisdiction. They must remain ledger-visible liabilities until resolved by successful payout, release/refund, legally required remittance, or documented compliance disposition; they must not become platform revenue by default.
- Platform fees, provider fees passed through to users, tax withholding, and any other deductions must be frozen, disclosed, and represented as separate settlement and ledger line items. Participant-facing payouts must distinguish gross participant payout, tax or compliance withholding, explicitly accepted fees, and net payout submitted to the provider. Fees or withholding must not be hidden inside adjusted-unit pricing, and participant-payout reserve funds must not be used for platform fees unless the frozen terms explicitly allocate that cost without reducing validly owed gross participant payouts.
- PaymentOperation records are not sufficient as the accounting source of truth. Use the repository’s existing ledger/accounting system if one exists; otherwise implement a simple internal double-entry ledger for reserves, authorizations, captures, releases, rollovers, payouts, sponsor matches, platform fees, and shortfalls. Ledger entries must balance per transaction and must reconcile to settlement line items and provider operations.
- Evidence uploads must be treated as untrusted files: enforce file size/type limits, scan or quarantine files before reviewer access where supported, serve private evidence through short-lived signed URLs, strip unnecessary metadata where appropriate, and never render uploaded evidence inline without sanitization.
- Evidence collection should minimize third-party exposure. Participant instructions and reviewer tools should discourage or redact third-party faces, names, contact information, card digits, addresses, receipt identifiers, geolocation, and other unrelated personal data before evidence is stored, reviewed, retained, or used in public summaries.
- Production real-money rounds must be jurisdiction-gated. Do not open funding, enrollment, payouts, or sponsor matching in a jurisdiction unless payments, payouts, participant eligibility, tax/compliance duties, and behavior-change round legality are supported or explicitly disabled for that jurisdiction.
- Moral impact weights, additionality priors, persistence multipliers, and raw-unit definitions must have a versioned methodology review and frozen public methodology summary before publication. Admins should not be able to silently change moral-impact scoring assumptions for live rounds.
- Moral-impact scoring must be protocol-relative. Each action template and round must freeze a safe public summary of the moral view, cause area, or funder constituency whose values the methodology is intended to operationalize, and public copy must not present protocol-specific weights as platform-endorsed universal moral truth.
- Action templates must specify material substitution effects, rebound effects, and negative externalities that can change moral impact. Raw units and adjusted units should be reduced, capped, excluded, or separately reported when a participant substitutes into behavior that materially undermines the intended moral good under the frozen methodology.
- Behavior-change templates must define repeat-participation and equivalence-group rules across materially similar templates, not only within the exact same template. A participant should not be able to evade cooldowns, repeat caps, additionality penalties, or anti-threat controls by switching between equivalent or near-equivalent action templates.
- Add operational observability for all real-money and sensitive-data flows: structured logs, metrics, alerts, and admin-visible stuck-job/failed-payment/failed-notification/evidence-access anomaly queues.
- Safety, privacy, security, payment, AI-processing, legal/compliance, and participant-welfare incidents must have an auditable incident-response workflow with severity, containment actions, owner, user-safe public messaging where appropriate, postmortem requirements, and links to operational pauses, disputes, retention holds, provider events, and remediation tasks.
- Production real-money ledgers, settlement snapshots, provider-event records, credited-action-unit records, and append-only audit metadata must have backup, restore, and disaster-recovery procedures. Backups must be encrypted and access-controlled, must not bypass retention/erasure policies, and restore drills must verify ledger/provider/settlement reconciliation before production launch or cap increases.
- Treat the server as the only source of authority for eligibility, clearing, verification decisions, additionality scoring, settlement calculation, payment amounts, status transitions, evidence access, and risk gates. Client-provided fields are untrusted and must be revalidated or recomputed server-side.
- Do not store raw sensitive values in AuditEvent snapshots, NotificationLog metadata, observability logs, or payment-provider event/debug payloads. Store redacted payloads, hashes, stable entity references, and access-controlled private rationales where needed.
- Content-hash the frozen round snapshot before launch, including template, formula, pricing, terms, verification, methodology, availability, reserve, notification, and settlement policies. Settlement and public reporting must reference the same frozen snapshot hash.
- Hashes, keyed hashes, content identifiers, request hashes, snapshot hashes, and raw-action-unit de-duplication keys must record their algorithm, canonicalization or derivation policy, and version. Use ordinary public cryptographic hashes for public immutable artifacts only when safe; use opaque identifiers or keyed hashes/HMACs for sensitive identifiers such as raw_unit_key values, evidence hashes, protected-reference hashes, and internal request hashes where public or cross-context exposure could enable dictionary attacks, correlation, or re-identification.
- Separate public snapshot/export data from private frozen policy snapshots. Private anti-gaming, fraud, risk, security, selection, and protected-threshold policy fields must not be returned by public APIs, embedded in public pages, or exposed to funders/sponsors; public exports should include only redacted methodology/terms plus the safe snapshot hash or public identifier.
- Public round descriptions, public reports, participant-visible reasons, public messages, public summaries, and any user-generated text rendered outside trusted admin contexts must be sanitized through a strict allowlist. Do not render arbitrary HTML, scripts, markdown extensions, embedded media, tracking pixels, or unsafe links from round/public-report/user text.
- Public APIs, public reports, funder/sponsor dashboards, logs, and analytics must not expose sensitive internal hashes, HMACs, raw_unit_key values, evidence content hashes, or hash preimage material. Public identifiers derived from sensitive records must be separately generated under the frozen public/private snapshot and hash-identifier policy.
- Rollover or donation of unused funder money to a successor round requires explicit funder consent to that refund preference, compatible currency/jurisdiction support, and a successor-round policy that does not materially expand the funder’s obligation without renewed consent; otherwise release the unused authorization.
- Use deterministic decimal or rational arithmetic for adjusted impact units, probabilities, weights, and cost-per-unit calculations with a frozen precision/rounding policy. Do not use binary floating-point arithmetic for settlement-critical impact or payout calculations.
- Store and enforce all deadlines in UTC, with an explicit display timezone or locale policy in the frozen round snapshot. UI may localize times, but clearing, verification, disputes, reauthorization, and settlement must use canonical UTC instants.
- Deadline-driven operations such as launch expiry, verification cutoffs, dispute-window closing, reauthorization reminders, expected settlement/payout reminders, evidence-retention deletion, and stalled-job escalation must run through idempotent scheduled jobs or the repository’s equivalent job-queue pattern. Retrying a deadline job must not duplicate notifications, status transitions, releases, settlement actions, or deletion actions.
- Team activation windows must satisfy frozen temporal-order rules: they must not extend past the relevant enrollment or launch deadline, must not require participants to start an action before activation and selection, and must leave enough time for required risk, reserve, authorization, and capacity checks before the action window begins.
- Implement lifecycle transitions through a server-side state-machine service rather than ad hoc status writes. The service must enforce allowed transitions, role permissions, invariant checks, audit events, and concurrency controls for every transition.
- Protect public forms, mutation endpoints, evidence uploads, pledge authorization, and admin actions with the repository’s CSRF/session protections, rate limits, abuse throttles, and bot/automation defenses where available. Document any production gaps.
- Add participant-welfare and anti-exploitation guardrails for paid behavior-change rounds: clear voluntary terms, no predatory targeting of financially vulnerable users, no selection/pricing based on protected attributes or sensitive proxies unless legally and ethically reviewed, and a configurable compensation-floor or fairness review when payouts may be materially burdensome relative to the requested action.
- Compute frozen snapshot hashes from canonical, deterministic serialization of the complete frozen round snapshot, not from incidental JSON key order, localized strings, mutable database rows, or client-generated payloads.
- Audit, ledger, state-transition, safety-review, methodology-review, risk-review, and payment-event records used for accountability must be append-only in normal operation. Corrections must be represented through reversal/correction records, superseding review records, or documented repair tooling rather than mutating or deleting historical records.
- Encrypt, tokenize, or otherwise use the repository’s strongest available protected-storage pattern for sensitive baseline data, private evidence references, payout destinations, KYC/tax/compliance references, payment-provider references, and private review rationales. Do not store raw card data, raw bank-account details, raw government IDs, or raw KYC documents in group-buying tables unless the repository already has a compliant vault/storage system for them.
- Reconcile privacy deletion with append-only auditability. Sensitive payloads, private evidence files, protected storage references, and vault tokens must be deletable, redacted, or crypto-erased according to the frozen retention policy, while append-only audit/ledger/review records retain only non-sensitive hashes, tombstones, redacted metadata, and legal/compliance hold references needed for accountability.
- Validate temporal ordering for all frozen UTC deadlines and action windows before publication and launch. Rounds must not have impossible or user-hostile timing, such as action windows ending before they start, verification deadlines before the action window ends, dispute windows that expire before verification decisions are visible, or reauthorization deadlines after authorizations expire.
- Represent credited raw action units as first-class server-side records with de-duplication keys. Settlement must consume these credited-unit records rather than relying only on aggregate counts, so concurrent or overlapping rounds cannot double-credit the same participant/action/window. raw_unit_key values must be generated server-side from canonical action-unit definitions using a privacy-preserving derivation policy; they must not embed raw participant identifiers, raw baseline data, raw timestamps precise enough to identify a person, payout data, or other sensitive values in plaintext.
- Production real-money rounds require legal/compliance review for labor/gig-work classification, charitable solicitation or fundraising rules, tax withholding/reporting, payment-provider acceptable-use constraints, sanctions/AML duties, and payout legality in supported jurisdictions; document unsupported cases and keep them disabled.
- Verify payment-provider webhook signatures, timestamps, and replay protection before treating provider events as authoritative. Unverified, stale, or replayed provider events must be stored as quarantined/failed events and must not update ledger balances, payment-operation state, or user-visible payment status.
- Payment-provider events may arrive out of order. Treat provider events as inputs to a payment state machine rather than blind overwrites; stale, lower-precedence, or inconsistent events must be ignored/quarantined or routed to reconciliation instead of regressing PaymentOperation, LedgerTransaction, payout, settlement, or user-visible payment state.
- Payment-provider API keys, webhook signing secrets, KYC/tax provider credentials, encryption keys, and feature-flag secrets must use the repository’s secret-management pattern or deployment secret store. They must not be committed, logged, embedded in snapshots, exposed to client bundles, or stored in ordinary database rows; rotation and emergency revocation should be documented for production.
- Any AI/ML/LLM-assisted review, summarization, risk scoring, verification triage, support tooling, or methodology drafting must be treated as untrusted assistance. Private baseline data, private evidence, payment/KYC/tax references, fraud/risk rationales, and protected policy snapshots may be sent to third-party processors only under an approved privacy/security/subprocessor policy; uploaded evidence and user text must be treated as prompt-injection-prone input; AI outputs must not be the sole authority for material adverse decisions; and private group-buying data must not be used to train external models unless a separate approved consent/compliance flow exists.
- Evidence objects and redaction derivatives must have server-computed content hashes or equivalent integrity identifiers. Keep original-evidence, sanitized-preview, and redacted-derivative provenance linked in private records so reviewers can audit transformations without exposing raw private material publicly.
- User-facing mutation operations that can create obligations or duplicate records—pledge authorization, enrollment, evidence upload, dispute/appeal filing, payout-destination submission, and high-risk admin approvals—must use server-side idempotency keys or equivalent duplicate-submission protection. Browser retries, double clicks, network retries, and background-job retries must not create duplicate pledges, enrollments, evidence records, appeals, approvals, or obligations.
- Reusing an idempotency key with a different actor, scope, operation type, or request_hash must fail closed and create a safe audit/observability event. It must not return the prior response for a materially different request and must not perform the new mutation.
- Production rollout must be risk-tiered and cap-limited. Public real-money group-buying rounds should have configurable per-round and global caps for authorized funds, participant count, payout amount, evidence volume, jurisdictions, and template categories; increasing caps or risk tier for production rounds should require the frozen review/dual-control path.
- User-facing flows for pledging, applying, evidence submission, adverse-decision notices, disputes, withdrawal, and payout status should meet basic accessibility and comprehension requirements: keyboard access, screen-reader labels, clear deadline/payment language, mobile responsiveness, accessible error recovery, and no reliance on color-only or media-only communication of obligations.
- Provide an auditable emergency pause/kill-switch mechanism for the group-buying feature. Authorized admins must be able to pause publication, new pledges, new enrollments, evidence uploads, clearing, settlement execution, payouts, outbound notifications, or the entire feature separately, while preserving safe withdrawal, support, dispute intake, required refunds/releases, and audit logging.
- Require step-up authentication or recent re-authentication for high-risk admin/compliance actions where the repository supports it, including launch approval, settlement approval/execution, payout execution, evidence export, private evidence emergency override, feature unpause, and overrides of fraud, safety, participant-welfare, legal, or payment-compliance holds.
- Public methodology and eligibility explanations must be informative but not gaming-enabling. Exact baseline thresholds, scoring weights, fraud/risk heuristics, and anti-threat triggers that would materially increase manipulation if disclosed should be frozen in private anti-gaming policy snapshots and summarized publicly at a safe level of detail.
- Funders and sponsors must not be able to select, approve, reject, identify, message, or target individual participants outside platform-approved aggregate mechanisms. Keep funder/sponsor interaction with participants mediated, aggregate, and non-discriminatory unless a specific template has passed legal, privacy, and participant-welfare review for a narrower flow.
- Do not facilitate off-platform side payments, private compensation promises, or participant/funder contact flows that bypass verification, tax, AML/sanctions, anti-threat, privacy, participant-welfare, reserve, or settlement controls. If users report side deals, coercion, or off-platform pressure, route them to risk review, incident response, or dispute handling under the frozen policy.
- Automated scores or rules may triage eligibility, risk, verification, selection, or payout issues, but material adverse decisions must either receive human review or be covered by a frozen low-risk automation policy. Users affected by rejection, non-selection, verification denial, payout hold, or risk block should receive a non-sensitive reason and a dispute/appeal path when feasible.

Feature name:
Use “Moral Goods Group Buying” in the UI. Internal naming should distinguish the shared purchase-envelope layer from envelope-specific models. Use GroupBuyRound only for the adjusted-impact batch-round envelope if that matches the codebase; use a shared PurchaseEnvelope / PurchaseEnvelopeRegistry naming convention for common lifecycle, funding, settlement, receipt, and reporting services. Do not force lots, baskets, or imported pledge-swap agreements to masquerade as GroupBuyRound records merely for routing convenience.

1. Inspect the repository first
Before coding:
- Identify framework, routing system, database layer, auth/session system, role/permissions pattern, existing moral-trade models, existing payment/donation flows, UI component system, test framework, lint/build commands.
- Reuse existing patterns rather than introducing a parallel architecture.
- If there is no payment integration, implement a payment-provider abstraction with a development/simulated provider and clear interfaces for real integrations later. Do not hard-code fake production payments.
- Identify whether the repository already has privacy, file-storage, audit-log, KYC/tax, sanctions-screening, age-gating, and payment-idempotency patterns. Reuse existing patterns where present and document missing production requirements where absent.
- Identify whether the repository already has notification/email/job-queue, payment-webhook, fraud/risk-review, and feature-flag patterns. Reuse them where present and document production gaps where absent.
- Identify whether the repository already has a transactional outbox, domain-event bus, projection/materialized-view repair pattern, or idempotent side-effect dispatcher. Reuse it for notifications, receipts, public progress, provider operations, and search/listing updates where present; otherwise implement a minimal DomainEventOutbox-equivalent pattern for group-buying state changes.
- Identify whether the repository already has ledger/accounting, file-upload security scanning, jurisdiction/availability gating, observability/alerting, and impact-methodology review patterns. Reuse them where present and document production gaps where absent.
- Identify whether the repository already has CSRF/session-hardening, rate-limiting, abuse-throttling, bot detection, allowed-state-machine, AML/related-party review, participant-welfare review, protected-attribute policy, and timezone/localization patterns. Reuse them where present and document production gaps where absent.
- Identify whether the repository already has encrypted field/storage utilities, secret-management patterns, key-rotation patterns, append-only audit/ledger conventions, legal/compliance review workflows, and raw-action-unit de-duplication patterns. Reuse them where present and document production gaps where absent.
- Identify whether the repository already has payment-webhook signature verification/replay protection, emergency pause/kill-switch infrastructure, and step-up authentication or recent reauthentication for sensitive admin actions. Reuse them where present and document production gaps where absent.
- Identify whether the repository already has retention/deletion/erasure workflows, legal/compliance hold handling, scheduled deadline jobs, and stale-job recovery patterns. Reuse them where present and document production gaps where absent.
- Identify whether the repository already has adverse-decision review/appeal flows, safe public-methodology redaction patterns, anti-gaming configuration, and participant/funder communication controls. Reuse them where present and document production gaps where absent.
- Identify whether existing pledge-swap / moral-trade agreement models already record compensated action windows, verification decisions, or action-unit claims. Reuse or adapt those records so group-buying cannot double-pay the same action already compensated elsewhere in Moral Trade.
- Identify whether the repository already has safe schema-migration, data-backfill, backup/restore, disaster-recovery, periodic reconciliation, and production-readiness-check patterns. Reuse them where present and document production gaps where absent.
- Identify whether the repository already has AI/ML/LLM processor controls, prompt-injection protections, third-party subprocessor review, model-output audit logs, mutation idempotency middleware, accessibility testing, and production rollout-cap patterns. Reuse them where present and document production gaps where absent.
- Identify whether the repository already has no-trade-baseline / impact-claims review, funder-counterfactual reporting, reviewer blinding or quality-audit workflows, incident-response/postmortem workflows, and severity-based incident escalation. Reuse them where present and document production gaps where absent.
- Identify whether the repository already has canonical serialization, cryptographic hash, HMAC/keyed-hash, opaque public identifier, key-rotation, and sensitive-hash redaction utilities. Reuse them where present and document production gaps where absent.
- Identify whether the repository already has platform-fee, provider-fee, tax-withholding, gross-vs-net-payout, participant-receipt, terms-revocation, behavior-template-equivalence, and property-based/invariant-testing patterns. Reuse them where present and document production gaps where absent.
- Identify whether the repository already has team invite, co-purchase, cohort activation, pending-authorization expiration, invite-abuse controls, and activation-window patterns. Reuse them where present and document production gaps where absent.
- Identify whether the repository already has public-content/rich-text sanitization, notification preference/consent management, research/data-use consent, team-invite token hashing/revocation, and capacity-reservation patterns. Reuse them where present and document production gaps where absent.

2. Data model / persistence
Add persistent models/tables for:

GroupBuyRound
- id
- title
- slug
- description
- action_template_id
- action_template_snapshot_json
- impact_formula_version
- settlement_formula_version
- pricing_terms_snapshot_json
- participant_terms_snapshot_json
- funder_terms_snapshot_json
- round_snapshot_hash
- round_snapshot_canonical_json
- public_round_snapshot_json
- private_policy_snapshot_ref nullable
- status: draft | under_review | funding | enrolling | ready_to_clear | active | verifying | settling | settled | cancelled
- safety_review_status: pending | approved | rejected | requires_changes
- impact_unit_definition
- moral_view_or_cause_area_summary_snapshot_json
- group_buy_validity_mode: instant_valid | team_threshold
- team_activation_scope: none | funder_only | participant_only | dual_sided
- team_activation_effect: none | eligibility_only | reserve_capacity_until_launch | activate_and_select_if_clear
- team_activation_policy_snapshot_json nullable
- team_activation_window_seconds nullable
- min_team_funder_count nullable
- min_team_participant_count nullable
- team_activation_privacy_policy_snapshot_json nullable
- team_invite_policy_snapshot_json nullable
- team_activation_capacity_policy_snapshot_json nullable
- minimum_expected_adjusted_units
- maximum_cost_per_adjusted_unit
- unit_price_minor
- participant_payout_cap_minor
- participant_payout_reserve_minor
- reserve_policy_snapshot_json
- funding_shortfall_policy_snapshot_json
- platform_fee_policy_snapshot_json
- provider_fee_policy_snapshot_json nullable
- tax_withholding_policy_snapshot_json nullable
- no_trade_baseline_policy_snapshot_json
- impact_claims_policy_snapshot_json
- unclaimed_payout_policy_snapshot_json
- notification_policy_snapshot_json
- notification_channel_policy_snapshot_json nullable
- retention_policy_snapshot_json
- deadline_job_policy_snapshot_json
- availability_policy_snapshot_json
- lifecycle_policy_snapshot_json
- selection_policy_snapshot_json
- participant_welfare_policy_snapshot_json
- research_data_use_policy_snapshot_json nullable
- anti_gaming_policy_snapshot_json
- adverse_decision_policy_snapshot_json
- participant_funder_interaction_policy_snapshot_json
- security_policy_snapshot_json nullable
- public_content_sanitization_policy_snapshot_json nullable
- observability_policy_snapshot_json nullable
- ai_processing_policy_snapshot_json nullable
- rollout_policy_snapshot_json nullable
- accessibility_policy_snapshot_json nullable
- invariant_test_policy_snapshot_json nullable
- risk_tier: dev_simulated | private_beta | limited_public | general_public nullable
- max_authorized_total_minor nullable
- max_participant_count nullable
- max_participant_payout_minor nullable
- pause_policy_snapshot_json nullable
- operational_pause_status: not_paused | intake_paused | money_movement_paused | fully_paused
- methodology_review_status: pending | approved | rejected | requires_changes
- participant_welfare_review_status: pending | approved | rejected | requires_changes
- currency
- display_timezone
- launch_deadline
- enrollment_deadline
- verification_submission_deadline
- dispute_deadline
- reauthorization_deadline nullable
- expected_settlement_at nullable
- expected_payout_at nullable
- action_start_at
- action_end_at
- verification_standard: light | standard | strong
- moral_impact_weight_default
- persistence_multiplier_default
- anti_threat_policy_version
- created_by
- public_report_visibility
- enabled_feature_modules_snapshot_json nullable
- operational_efficiency_policy_snapshot_json nullable
- purchase_envelope_architecture_version nullable
- purchase_envelope_registry_id nullable
- frozen_policy_bundle_id nullable
- timestamps

ActionTemplate
- id
- name
- version
- category: diet | donation | volunteering | advocacy | offset | custom_admin_only
- description
- moral_view_or_cause_area_summary nullable
- safety_review_status: pending | approved | rejected | requires_changes
- methodology_review_status: pending | approved | rejected | requires_changes
- participant_welfare_review_status: pending | approved | rejected | requires_changes
- prohibited_use_policy_version
- double_count_policy_version
- jurisdiction_policy_version
- anti_gaming_policy_version
- participant_funder_interaction_policy_version
- behavior_change_equivalence_key nullable
- repeat_participation_policy_version nullable
- raw_unit_name
- baseline_fields_schema
- verification_fields_schema
- eligibility_rules_schema
- default_moral_impact_weight
- default_persistence_multiplier
- allowed_verification_standards
- is_admin_approved
- is_active
- timestamps

FrozenPolicyComponent
- id
- component_type: lifecycle | selection | verification | settlement | reserve | shortfall | fee_withholding | donation_recipient | donor_of_record | tax_receipt | anti_gaming | participant_welfare | adverse_decision | notification | retention | public_reporting | privacy_redaction | hash_identifier | deadline_job | jurisdiction | production_compliance | ai_processing | emergency_pause | accessibility | allocation_rationing | domain_event_outbox | public_progress_suppression | offset_claims | user_comprehension | other
- component_version
- canonical_json
- canonicalization_policy_version
- component_hash
- hash_algorithm
- public_export_json nullable
- private_policy_snapshot_ref nullable
- redaction_policy_version
- status: draft | frozen | superseded | revoked_for_future_use
- created_by nullable
- frozen_at nullable
- timestamps

FrozenPolicyBundle
- id
- purchase_envelope_type nullable
- purchase_envelope_id nullable
- bundle_type: publication | launch | activation | settlement | public_report | cancellation | repair | other
- component_manifest_json
- bundle_canonical_json
- bundle_hash
- hash_algorithm
- canonicalization_policy_version
- public_bundle_export_json nullable
- private_policy_snapshot_ref nullable
- compatibility_check_status: pending | passed | failed | waived_dev_only
- status: draft | frozen | superseded | revoked_for_future_use
- created_by nullable
- frozen_at nullable
- timestamps

PurchaseEnvelopeRegistry
- id
- envelope_type: group_buy_round | crowdfunded_pledge_swap_lot | crowdfunded_pledge_swap_basket | crowdfunded_pledge_swap_basket_item | pledge_swap_agreement_adapter | other
- envelope_entity_id
- parent_envelope_type nullable
- parent_envelope_id nullable
- public_envelope_id
- title_snapshot
- currency
- lifecycle_status
- lifecycle_state_group: draft_review | funding | funded_awaiting_acceptance | accepted_not_active | active | evidence_due | under_review | settling | completed | released_expired_cancelled | blocked_paused
- status_category: draft | funding | enrolling | awaiting_participant_acceptance | active | verifying | settling | settled | expired | cancelled | paused
- enabled_feature_modules_snapshot_json nullable
- frozen_policy_bundle_id nullable
- public_snapshot_hash nullable
- private_policy_snapshot_ref nullable
- projection_version nullable
- projection_reconciled_at nullable
- projection_reconciliation_status: not_checked | consistent | stale | mismatch | repair_required nullable
- purchase_envelope_architecture_version
- created_by nullable
- timestamps


FundingSourceCommitment
- id
- purchase_envelope_type
- purchase_envelope_id
- funding_source_type: ordinary_funder_pledge | crowdfunded_micro_pledge | standing_microfund_allocation | sponsor_matching_pool | sponsor_gap_fill | platform_reserve | dev_simulated_reserve
- funding_source_id
- funder_user_id nullable
- sponsor_user_id nullable
- amount_authorized_minor
- amount_reserved_minor
- amount_committed_minor
- amount_charged_minor
- amount_released_minor
- currency
- reserve_eligibility: not_reserve_eligible | participant_payout_reserve_eligible | charitable_donation_reserve_eligible | sponsor_gap_fill_reserve_eligible | dev_only
- constraints_snapshot_json
- accepted_routing_policy_snapshot_json nullable
- max_provider_fee_ratio_decimal nullable
- max_platform_fee_ratio_decimal nullable
- allocation_explanation_preference: concise | detailed | receipts_only nullable
- authorization_expires_at nullable
- funding_source_status: pending | authorized | reserved | activated | captured | released | expired | failed | cancelled | blocked
- idempotency_key nullable unique
- timestamps

ParticipantActionCommitment
- id
- purchase_envelope_type: group_buy_round | crowdfunded_pledge_swap_lot | crowdfunded_pledge_swap_basket | basket_item | pledge_swap_agreement_adapter | other
- purchase_envelope_id
- participant_user_id
- participant_enrollment_id nullable
- basket_item_id nullable
- source_pledge_swap_agreement_id nullable
- action_template_id
- action_template_snapshot_json
- action_window_start_at
- action_window_end_at
- baseline_snapshot_ref nullable
- expected_raw_units nullable
- expected_adjusted_units nullable
- participant_visible_action_summary
- participant_preacceptance_status: not_required | offered | preaccepted | declined | expired | withdrawn | replaced nullable
- participant_acceptance_status: not_invited | invited | accepted | declined | expired | withdrawn nullable
- acceptance_expires_at nullable
- action_start_permission_status: not_allowed | allowed_after_funding_and_reserve | active | withdrawn | cancelled nullable
- public_identity_visibility: anonymous | pseudonymous_public_id | disclosed_opt_in | admin_only nullable
- participant_visible_public_id nullable
- private_action_obligation_snapshot_ref nullable
- commitment_status: pending_selection | invited | accepted | active | withdrawn | verifying | verified | failed | disputed | settled | cancelled | expired
- accepted_terms_acceptance_id nullable
- selected_status_notified_at nullable
- verification_decision_id nullable
- credited_action_unit_status: not_started | reserved | credited | duplicate_blocked | de_duplicated | reversed
- privacy_display_policy_snapshot_json nullable
- timestamps

SettlementPlan
- id
- purchase_envelope_type: group_buy_round | crowdfunded_pledge_swap_lot | crowdfunded_pledge_swap_basket | basket_item | pledge_swap_agreement_adapter | other
- purchase_envelope_id
- round_id nullable
- settlement_id nullable
- plan_status: draft | computed | approved | superseded | executing | executed | failed | cancelled
- frozen_policy_bundle_hash
- calculation_input_hash
- calculation_output_hash nullable
- funding_source_set_hash
- credited_action_unit_set_hash nullable
- consideration_obligation_set_hash
- fee_withholding_line_item_set_hash nullable
- donation_operation_set_hash nullable
- payout_operation_set_hash nullable
- release_operation_set_hash nullable
- ledger_transaction_set_hash nullable
- reserve_check_status: not_required | passed | failed | stale
- recipient_funding_compatibility_status: not_required | passed | failed | stale
- fee_ratio_check_status: not_required | passed | failed | waived_with_review
- verification_burden_check_status: not_required | passed | failed | waived_with_review
- approved_by_user_id nullable
- approved_at nullable
- executed_at nullable
- superseded_by_settlement_plan_id nullable
- timestamps

PurchaseEnvelopeForecast
- id
- purchase_envelope_type: group_buy_round | crowdfunded_pledge_swap_lot | crowdfunded_pledge_swap_basket | basket_item | pledge_swap_agreement_adapter | other
- purchase_envelope_id
- forecast_version
- forecast_source: admin_estimate | methodology_default | model_assisted | calibration_prior | imported | other
- expected_funding_probability nullable
- expected_participant_acceptance_probability nullable
- expected_completion_probability nullable
- expected_raw_units nullable
- expected_adjusted_units nullable
- expected_verification_confidence nullable
- expected_provider_fee_minor nullable
- expected_platform_fee_minor nullable
- expected_operator_cost_minor nullable
- expected_verification_review_minutes nullable
- expected_participant_burden_minutes nullable
- expected_cost_per_adjusted_unit_minor nullable
- uncertainty_interval_json nullable
- public_forecast_summary_json nullable
- private_forecast_rationale nullable
- forecast_input_hash nullable
- created_by nullable
- created_at

MechanismCalibrationRun
- id
- calibration_type: forecast_vs_actual | additionality_prior | verification_confidence | completion_probability | funding_conversion | fee_ratio | verification_burden | participant_welfare | other
- purchase_envelope_type nullable
- purchase_envelope_id nullable
- action_template_id nullable
- methodology_version nullable
- input_forecast_set_hash
- actual_outcome_set_hash
- calibration_result_json_redacted
- discrepancy_summary_json_redacted nullable
- proposed_methodology_update_ref nullable
- public_summary nullable
- status: pending | running | completed | failed | superseded | waived_dev_only
- created_by nullable
- started_at nullable
- completed_at nullable
- timestamps

FundingSourceRoutingDecision
- id
- funding_source_type: funder_pledge | micro_pledge | standing_microfund_pool | standing_microfund_allocation | sponsor_match | sponsor_gap_fill | platform_reserve
- funding_source_id
- from_purchase_envelope_type nullable
- from_purchase_envelope_id nullable
- to_purchase_envelope_type
- to_purchase_envelope_id
- routing_reason: near_clearing | basket_preferred | fee_minimization | recipient_constraint_match | successor_round | manual_admin_review | user_manual_choice | other
- amount_routed_minor
- currency
- user_constraints_hash
- recipient_scope_check_status: not_required | passed | failed
- fee_ratio_check_status: not_required | passed | failed
- consent_check_status: passed | failed
- user_visible_explanation
- routing_status: proposed | accepted | locked | executed | released | cancelled | expired | failed
- idempotency_key unique
- timestamps


MoralGoodsFeatureCapability
- id
- feature_module: adjusted_impact_rounds | crowdfunded_pledge_swap_lots | crowdfunded_pledge_swap_baskets | standing_microfund_pools | participant_donation_recipient_choice | sponsor_gap_fill | participant_proposal_intake | internal_wallet_balance | charitable_donation_execution | production_real_money_movement
- environment: development | staging | production
- status: disabled | dev_only | private_beta | limited_public | enabled | paused
- risk_tier: dev_simulated | private_beta | limited_public | general_public nullable
- jurisdiction_scope nullable
- max_authorized_total_minor nullable
- max_micro_pledge_count nullable
- max_participant_count nullable
- max_lot_count nullable
- max_basket_count nullable
- requires_dual_control
- requires_step_up_auth
- provider_minimum_policy_snapshot_json nullable
- compliance_review_ref nullable
- rollout_review_ref nullable
- depends_on_feature_modules_json nullable
- incompatible_feature_modules_json nullable
- capability_dependency_status: not_checked | satisfied | blocked | waived_dev_only
- module_interaction_policy_snapshot_json nullable
- enabled_by nullable
- disabled_by nullable
- timestamps

FunderPledge
- id
- round_id
- funder_user_id
- amount_authorized_minor
- amount_committed_minor
- amount_charged_minor
- currency
- pledge_tranche: participant_guarantee | conditional_impact_purchase | bonus_pool
- activation_group_id nullable
- activation_status: instant_valid | pending_team | activated | expired | cancelled
- activation_window_started_at nullable
- activation_expires_at nullable
- team_activation_terms_accepted_at nullable
- counts_toward_participant_payout_reserve
- threshold_evaluation_stage: launch | settlement
- max_cost_per_adjusted_unit_minor
- minimum_total_adjusted_units_required
- accepted_additionality_classes
- accepted_verification_standards
- accepted_consideration_types nullable
- accepted_donation_recipient_scope_snapshot_json nullable
- accepted_donor_of_record_policy_snapshot_hash nullable
- accepted_participant_recipient_choice_policy_snapshot_hash nullable
- refund_preference: release | roll_forward | donate_to_platform_chosen_successor_round
- anonymity: public | anonymous | platform_only
- counterfactual_funding_category: not_asked | declined | same_cause | different_moral_good | personal_consumption | other nullable
- counterfactual_funding_notes_private nullable
- counterfactual_disclosure_consent_at nullable
- payment_authorization_id nullable
- payment_authorization_expires_at nullable
- payment_risk_status: not_checked | clear | review_required | blocked
- aml_risk_status: not_checked | clear | review_required | blocked
- related_party_check_status: not_checked | clear | review_required | blocked
- jurisdiction_check_status: not_checked | supported | unsupported | review_required | dev_waived
- funder_terms_accepted_at nullable
- status: authorized | captured | released | failed | cancelled
- timestamps

CrowdfundedPledgeSwapLot
- id
- round_id nullable
- source_pledge_swap_agreement_id nullable
- basket_id nullable
- participant_proposal_id nullable
- title
- slug
- action_template_id
- action_template_snapshot_json
- participant_user_id nullable
- participant_enrollment_id nullable
- lot_kind: single_participant_pledge_swap | small_cohort_pledge_swap
- consideration_type: charitable_donation | participant_payout | mixed
- consideration_recipient_policy: fixed_admin_approved_charity | participant_selected_from_approved_list | funder_selected_from_approved_list | mixed_frozen_split
- participant_recipient_choice_required
- participant_selected_donation_recipient_id nullable
- participant_recipient_choice_deadline nullable
- participant_recipient_fallback_policy_snapshot_json nullable
- approved_donation_recipient_list_snapshot_json nullable
- donor_of_record_policy_snapshot_json nullable
- tax_receipt_policy_snapshot_json nullable
- funder_recipient_constraint_policy_snapshot_json nullable
- operational_efficiency_review_status: not_required | pending | approved | rejected | requires_changes
- single_lot_rationale_private nullable
- sponsor_gap_fill_commitment_id nullable
- standing_microfund_pool_eligible
- donation_recipient_id nullable
- donation_destination_snapshot_json nullable
- participant_payout_terms_snapshot_json nullable
- participant_action_obligation_snapshot_json
- target_total_consideration_minor
- minimum_clearing_consideration_minor
- amount_authorized_minor
- amount_committed_minor
- amount_captured_minor
- amount_released_minor
- amount_donated_minor
- amount_paid_to_participant_minor
- currency
- micro_pledge_min_minor
- micro_pledge_default_minor
- micro_pledge_max_minor
- micro_pledge_provider_minimum_policy_snapshot_json nullable
- min_micro_funder_count nullable
- max_micro_funder_count nullable
- overfunding_policy: close_at_target | release_overage | allow_bonus_pool | scale_action_units_if_frozen
- overfunding_allocation_policy_snapshot_json nullable
- public_progress_suppression_policy_snapshot_json nullable
- offset_claims_policy_snapshot_json nullable
- user_comprehension_policy_snapshot_json nullable
- underfunding_policy: expire_release | extend_once_if_frozen | admin_cancel
- funding_validity_mode: instant_valid | team_threshold
- activation_group_id nullable
- funding_deadline
- participant_acceptance_deadline nullable
- action_start_at
- action_end_at
- verification_submission_deadline
- dispute_deadline
- expected_donation_or_payout_at nullable
- donation_or_payout_reserve_minor
- donation_or_payout_reserve_status: not_required | pending | reserved | released | failed
- verification_standard: light | standard | strong
- expected_raw_units
- expected_adjusted_units nullable
- fixed_consideration_formula_version
- impact_reporting_formula_version
- donation_receipt_policy_snapshot_json nullable
- donor_of_record_eligibility_policy_snapshot_json nullable
- tax_deductibility_disclosure_snapshot_json nullable
- restricted_fund_policy_snapshot_json nullable
- charity_due_diligence_policy_snapshot_json nullable
- participant_terms_snapshot_json
- funder_terms_snapshot_json
- public_lot_snapshot_json
- private_policy_snapshot_ref nullable
- lot_snapshot_canonical_json
- lot_snapshot_hash
- purchase_envelope_registry_id nullable
- frozen_policy_bundle_id nullable
- participant_action_commitment_id nullable
- participant_publicity_status: default_private | participant_opted_in_public_after_review | admin_approved_public_story | blocked
- status: draft | under_review | funding | fully_funded | participant_invited | accepted | active | verifying | settling | settled | expired | cancelled
- safety_review_status: pending | approved | rejected | requires_changes
- methodology_review_status: pending | approved | rejected | requires_changes
- participant_welfare_review_status: pending | approved | rejected | requires_changes
- jurisdiction_check_status: not_checked | supported | unsupported | review_required | dev_waived
- public_report_visibility
- timestamps

CrowdfundedPledgeSwapMicroPledge
- id
- lot_id nullable
- basket_id nullable
- standing_microfund_pool_id nullable
- standing_microfund_allocation_id nullable
- allocation_source: direct_micro_pledge | standing_microfund_pool | sponsor_gap_fill
- funder_user_id
- amount_authorized_minor
- amount_committed_minor
- amount_charged_minor
- amount_released_minor
- currency
- activation_group_id nullable
- activation_status: instant_valid | pending_team | activated | expired | cancelled
- payment_authorization_id nullable
- payment_authorization_expires_at nullable
- payment_risk_status: not_checked | clear | review_required | blocked
- aml_risk_status: not_checked | clear | review_required | blocked
- related_party_check_status: not_checked | clear | review_required | blocked
- jurisdiction_check_status: not_checked | supported | unsupported | review_required | dev_waived
- refund_preference: release | roll_forward | donate_to_platform_chosen_successor_round
- anonymity: public | anonymous | platform_only
- counterfactual_funding_category: not_asked | declined | same_cause | different_moral_good | personal_consumption | other nullable
- counterfactual_funding_notes_private nullable
- accepted_donation_recipient_scope_snapshot_json nullable
- accepted_donor_of_record_policy_snapshot_hash nullable
- accepted_participant_recipient_choice_policy_snapshot_hash nullable
- allocation_review_mode: auto_lock | preview_then_lock | manual_approval_required nullable
- allocation_notice_expires_at nullable
- funder_terms_accepted_at nullable
- micro_pledge_status: authorized | captured | released | failed | expired | cancelled
- timestamps

DonationRecipient
- id
- name
- legal_name nullable
- jurisdiction_scope
- charity_registration_ref nullable
- cause_area
- effective_charity_evaluation_ref nullable
- effective_charity_evaluation_checked_at nullable
- effective_charity_evaluation_expires_at nullable
- approved_payment_destination_ref nullable
- payment_destination_verified_at nullable
- payment_destination_expires_at nullable
- due_diligence_status: pending | approved | rejected | requires_changes | expired | dev_only
- due_diligence_checked_at nullable
- due_diligence_expires_at nullable
- sanctions_aml_status: not_checked | clear | review_required | blocked | expired
- sanctions_aml_checked_at nullable
- sanctions_aml_expires_at nullable
- donation_receipt_policy_snapshot_json nullable
- donor_of_record_eligibility_policy_snapshot_json nullable
- tax_deductibility_disclosure_snapshot_json nullable
- restricted_fund_policy_snapshot_json nullable
- public_summary
- private_notes nullable
- is_active
- timestamps

PledgeSwapDonationOperation
- id
- lot_id
- settlement_id nullable
- donation_recipient_id
- amount_minor
- currency
- provider_name
- provider_operation_ref nullable
- idempotency_key unique
- donation_receipt_ref nullable
- donor_of_record_type: platform | funder | sponsor | donor_advised_fund | external_processor | not_applicable nullable
- donor_of_record_user_id nullable
- donation_tax_receipt_user_id nullable
- donation_receipt_json_redacted nullable
- donation_failure_policy_snapshot_hash nullable
- status: pending | succeeded | failed | retryable | cancelled | held
- last_error_redacted nullable
- timestamps


ConsiderationObligation
- id
- purchase_envelope_type: group_buy_round | crowdfunded_pledge_swap_lot | crowdfunded_pledge_swap_basket | basket_item | pledge_swap_agreement
- purchase_envelope_id
- settlement_id nullable
- enrollment_id nullable
- basket_item_id nullable
- participant_user_id nullable
- beneficiary_type: participant | donation_recipient | mixed | platform_fee_recipient | provider | tax_authority | other
- beneficiary_user_id nullable
- donation_recipient_id nullable
- consideration_type: participant_payout | charitable_donation | mixed | tax_withholding | provider_fee | platform_fee | sponsor_bonus | release_or_refund
- trigger_policy_snapshot_json
- reserve_policy_snapshot_json
- amount_promised_minor
- amount_reserved_minor
- amount_earned_minor
- amount_executed_minor
- amount_released_minor
- currency
- obligation_status: pending | reserved | earned | partially_earned | executed | held | failed | released | cancelled | reversed
- source_funding_summary_hash nullable
- calculation_input_hash nullable
- calculation_output_hash nullable
- timestamps

CrowdfundedPledgeSwapBasket
- id
- round_id nullable
- title
- slug
- basket_kind: homogeneous_lots | equivalent_template_lots | admin_curated_mixed_lots
- action_template_id
- action_template_snapshot_json
- lot_count_target
- lot_count_minimum_to_clear
- lot_count_settled
- per_lot_consideration_minor
- target_total_consideration_minor
- minimum_clearing_consideration_minor
- amount_authorized_minor
- amount_committed_minor
- amount_captured_minor
- amount_released_minor
- amount_donated_minor
- amount_paid_to_participants_minor
- currency
- consideration_type: charitable_donation | participant_payout | mixed
- consideration_recipient_policy: fixed_admin_approved_charity | participant_selected_from_approved_list | mixed_frozen_split
- approved_donation_recipient_list_snapshot_json nullable
- participant_recipient_choice_policy_snapshot_json nullable
- basket_item_replacement_policy_snapshot_json nullable
- participant_noncompletion_policy_snapshot_json nullable
- overfunding_allocation_policy_snapshot_json nullable
- public_progress_suppression_policy_snapshot_json nullable
- offset_claims_policy_snapshot_json nullable
- user_comprehension_policy_snapshot_json nullable
- micro_pledge_min_minor
- micro_pledge_default_minor
- micro_pledge_max_minor
- micro_pledge_provider_minimum_policy_snapshot_json nullable
- standing_microfund_pool_eligible
- min_micro_funder_count nullable
- max_micro_funder_count nullable
- sponsor_gap_fill_commitment_id nullable
- overfunding_policy: close_at_target | release_overage | allow_bonus_pool | add_basket_items_if_frozen
- underfunding_policy: expire_release | sponsor_gap_fill_if_threshold_met | extend_once_if_frozen | admin_cancel
- funding_validity_mode: instant_valid | team_threshold
- funding_deadline
- participant_acceptance_deadline nullable
- action_start_at
- action_end_at
- verification_submission_deadline
- dispute_deadline
- expected_donation_or_payout_at nullable
- donation_or_payout_reserve_minor
- donation_or_payout_reserve_status: not_required | pending | reserved | released | failed
- verification_standard: light | standard | strong
- expected_raw_units_total
- expected_adjusted_units_total nullable
- fixed_consideration_formula_version
- impact_reporting_formula_version
- public_basket_snapshot_json
- private_policy_snapshot_ref nullable
- basket_snapshot_canonical_json
- basket_snapshot_hash
- purchase_envelope_registry_id nullable
- frozen_policy_bundle_id nullable
- basket_publicity_policy_snapshot_json nullable
- status: draft | under_review | funding | fully_funded | participant_selection | participant_acceptance | active | verifying | settling | settled | expired | cancelled
- safety_review_status: pending | approved | rejected | requires_changes
- methodology_review_status: pending | approved | rejected | requires_changes
- participant_welfare_review_status: pending | approved | rejected | requires_changes
- jurisdiction_check_status: not_checked | supported | unsupported | review_required | dev_waived
- public_report_visibility
- timestamps

CrowdfundedPledgeSwapBasketItem
- id
- basket_id
- lot_id nullable
- participant_enrollment_id nullable
- action_commitment_id nullable
- participant_user_id nullable
- participant_proposal_id nullable
- donation_recipient_id nullable
- participant_selected_donation_recipient_id nullable
- item_sequence
- item_action_obligation_snapshot_json
- item_consideration_minor
- item_expected_raw_units
- item_expected_adjusted_units nullable
- item_status: pending_selection | participant_invited | accepted | active | verifying | verified | failed | replaced | cancelled | settled
- replacement_of_basket_item_id nullable
- verification_decision_id nullable
- credited_to_settlement_id nullable
- timestamps

StandingMicrofundPool
- id
- funder_user_id
- title
- currency
- period: monthly | weekly | one_time_budget
- period_limit_minor
- remaining_period_budget_minor
- per_lot_cap_minor
- per_basket_cap_minor
- per_basket_item_cap_minor nullable
- minimum_allocation_minor
- cause_area_allowlist_json nullable
- action_template_allowlist_json nullable
- consideration_type_allowlist_json nullable
- donation_recipient_allowlist_json nullable
- max_cost_per_adjusted_unit_minor nullable
- accepted_additionality_classes nullable
- accepted_verification_standards nullable
- allocation_strategy: first_clearing_eligible | highest_expected_adjusted_units | diversify_across_baskets | user_ranked_rules
- allocation_objective_policy_snapshot_json nullable
- allocation_rationing_policy_snapshot_json nullable
- platform_revenue_routing_exclusion_policy_snapshot_json nullable
- public_progress_suppression_policy_snapshot_json nullable
- allocation_review_mode: auto_lock | preview_then_lock | manual_approval_required
- max_provider_fee_ratio_decimal nullable
- max_total_fee_ratio_decimal nullable
- routing_preference_policy_snapshot_json nullable
- allocation_explanation_preference: concise | detailed | receipts_only
- allocation_notice_window_seconds nullable
- allocation_lock_policy_snapshot_json nullable
- internal_balance_legal_status: not_used | dev_only | compliance_review_required | approved | blocked nullable
- provider_minimum_batching_policy_snapshot_json nullable
- allocation_policy_snapshot_json
- payment_funding_source_ref nullable
- payment_authorization_id nullable
- payment_authorization_expires_at nullable
- wallet_or_internal_balance_account_id nullable
- auto_renew_status: active | paused | cancelled | expired
- next_period_starts_at nullable
- funder_terms_accepted_at nullable
- status: draft | active | paused | exhausted | cancelled | blocked
- timestamps

StandingMicrofundAllocation
- id
- standing_microfund_pool_id
- lot_id nullable
- basket_id nullable
- basket_item_id nullable
- micro_pledge_id nullable
- amount_allocated_minor
- amount_authorized_minor
- amount_charged_minor
- amount_released_minor
- currency
- allocation_reason_snapshot_json
- allocation_status: proposed | authorized | activated | captured | released | failed | cancelled | expired
- idempotency_key unique
- timestamps

ParticipantDonationRecipientChoice
- id
- lot_id nullable
- basket_item_id nullable
- participant_user_id
- participant_enrollment_id nullable
- approved_recipient_list_snapshot_hash
- selected_donation_recipient_id
- fallback_donation_recipient_id nullable
- choice_status: offered | selected | frozen | replaced_before_action | blocked | cancelled
- participant_terms_accepted_at nullable
- chosen_at nullable
- frozen_at nullable
- replacement_reason_private nullable
- timestamps

SponsorGapFillCommitment
- id
- round_id nullable
- lot_id nullable
- basket_id nullable
- sponsor_user_id nullable
- trigger_threshold_percent_decimal
- trigger_threshold_amount_minor
- max_gap_fill_amount_minor
- amount_reserved_minor
- amount_used_minor
- currency
- eligible_scope_policy_snapshot_json
- matching_rule_snapshot_json
- reserve_status: pending | reserved | released | failed
- activation_status: pending | active | triggered | expired | cancelled | blocked
- funding_deadline
- sponsor_terms_accepted_at nullable
- jurisdiction_check_status: not_checked | supported | unsupported | review_required | dev_waived
- aml_risk_status: not_checked | clear | review_required | blocked
- related_party_check_status: not_checked | clear | review_required | blocked
- timestamps

ParticipantPledgeSwapProposal
- id
- participant_user_id
- proposed_action_template_id nullable
- proposed_action_text_private
- proposed_consideration_type: charitable_donation | participant_payout | mixed | other
- proposed_consideration_amount_minor nullable
- currency nullable
- proposed_donation_recipient_preferences_json nullable
- proposed_action_window_json nullable
- proposal_status: draft | submitted | under_review | converted_to_lot | rejected | withdrawn | blocked
- safety_review_status: pending | approved | rejected | requires_changes
- methodology_review_status: pending | approved | rejected | requires_changes | not_applicable
- participant_welfare_review_status: pending | approved | rejected | requires_changes
- anti_threat_flags_json nullable
- converted_lot_id nullable
- converted_basket_id nullable
- participant_visible_reason nullable
- reviewer_notes_private nullable
- submitted_at nullable
- reviewed_at nullable
- timestamps

SponsorMatchingPool
- id
- round_id nullable
- lot_id nullable
- basket_id nullable
- sponsor_user_id nullable
- amount_available_minor
- amount_used_minor
- currency
- match_ratio
- max_match_amount_minor
- matching_rule_json
- matching_mode: ordinary_round_match | last_dollar_gap_fill | basket_gap_fill | bonus_pool
- trigger_threshold_percent_decimal nullable
- trigger_threshold_amount_minor nullable
- counts_toward_participant_payout_reserve
- jurisdiction_check_status: not_checked | supported | unsupported | review_required | dev_waived
- aml_risk_status: not_checked | clear | review_required | blocked
- related_party_check_status: not_checked | clear | review_required | blocked
- sponsor_terms_accepted_at nullable
- status
- timestamps

ParticipantEnrollment
- id
- round_id
- participant_user_id
- age_gate_status: not_checked | adult_verified | guardian_flow_required | rejected_minor
- identity_check_status: not_required | pending | verified | failed | waived_dev_only
- fraud_risk_status: not_checked | clear | review_required | blocked
- related_party_check_status: not_checked | clear | review_required | blocked
- participant_welfare_review_status: not_checked | clear | review_required | blocked
- adverse_decision_review_status: not_required | pending | reviewed | appeal_open | appeal_resolved
- jurisdiction_check_status: not_checked | supported | unsupported | review_required | dev_waived
- eligibility_status: pending | eligible | rejected | waitlist_control | selected_paid | withdrawn
- activation_group_id nullable
- activation_status: instant_valid | pending_team | activated | expired | cancelled
- activation_window_started_at nullable
- activation_expires_at nullable
- team_activation_terms_accepted_at nullable
- control_followup_consent_at nullable
- selected_status_notified_at nullable
- double_count_check_status: not_checked | clear | possible_overlap | blocked
- baseline_answers_json
- baseline_raw_units_estimate
- additionality_probability
- additionality_class: A | B | C | rejected
- verification_confidence_prior
- expected_adjusted_units
- payout_destination_status
- participant_terms_accepted_at nullable
- repeat_participation_count
- repeat_participation_equivalence_group_count nullable
- anti_threat_flags_json
- selection_random_seed_or_batch_id nullable
- timestamps


TeamActivationGroup
- id
- round_id
- group_type: funder_pledge_team | participant_enrollment_team | dual_sided_cohort
- validity_mode: team_threshold
- initiator_user_id nullable
- status: pending | activated | expired | cancelled
- activation_window_started_at
- activation_expires_at
- activated_at nullable
- expired_at nullable
- min_funder_count nullable
- min_participant_count nullable

- max_funder_count nullable
- max_participant_count nullable
- activation_overflow_policy_snapshot_json nullable
- current_funder_count
- current_participant_count
- qualified_funder_count
- qualified_participant_count
- counts_recomputed_at nullable
- counts_source_hash nullable

- overflow_waitlist_count nullable
- activation_lock_version
- public_group_id nullable
- invite_token_hash nullable
- invite_token_hash_policy_version nullable
- invite_token_expires_at nullable
- invite_max_uses nullable
- invite_use_count
- invite_status: none | active | revoked | expired | blocked
- invite_abuse_risk_status: not_checked | clear | review_required | blocked
- privacy_policy_snapshot_json
- activation_failure_policy_snapshot_json
- activation_effect: eligibility_only | reserve_capacity_until_launch | activate_and_select_if_clear
- capacity_reservation_status: not_applicable | pending | reserved | released | failed
- reserved_participant_slots nullable
- reserved_budget_minor nullable
- terms_snapshot_hash
- timestamps

TeamActivationMember
- id
- activation_group_id
- user_id
- pledge_id nullable
- enrollment_id nullable
- invitation_id nullable
- member_role: initiator | co_funder | co_participant
- status: pending | activated | withdrawn | expired | blocked
- natural_person_dedup_status: not_checked | unique | duplicate | review_required | blocked
- threshold_qualification_status: pending | qualified | disqualified | review_required
- joined_at
- activated_at nullable
- expired_at nullable
- timestamps

TeamActivationInvite
- id
- activation_group_id
- inviter_user_id nullable
- invite_token_hash
- invite_token_hash_policy_version
- invite_status: active | revoked | expired | blocked
- max_uses nullable
- use_count
- expires_at
- created_at
- revoked_at nullable
- abuse_report_count
- last_used_at nullable

SelectionDecision
- id
- round_id nullable
- purchase_envelope_type nullable
- purchase_envelope_id nullable
- enrollment_id nullable
- participant_action_commitment_id nullable
- decision_type: selected_paid | waitlist_control | not_selected | rejected
- expected_adjusted_units_at_selection
- expected_payout_minor_at_selection
- selection_score
- selection_reason_private
- participant_visible_reason nullable
- participant_notified_at nullable
- appeal_deadline_at nullable
- fairness_or_welfare_flag: none | review_required | overridden
- randomization_batch_id nullable
- randomization_seed_hash nullable
- decided_by_user_id nullable
- decided_at

VerificationSubmission
- id
- enrollment_id nullable
- participant_action_commitment_id nullable
- submitted_by
- submission_type: daily_checkin | prompted_checkin | receipt | photo | attestation | final_declaration | other
- evidence_metadata_json
- private_evidence_url_or_storage_ref nullable
- evidence_mime_type nullable
- evidence_size_bytes nullable
- evidence_scan_status: not_required | pending | clean | quarantined | failed
- evidence_original_hash nullable
- evidence_sanitized_preview_hash nullable
- evidence_redacted_derivative_hash nullable
- evidence_processing_policy_version nullable
- evidence_metadata_stripped_at nullable
- third_party_redaction_status: not_required | pending | completed | failed
- evidence_retention_expires_at nullable
- public_summary nullable
- submitted_at

VerificationDecision
- id
- enrollment_id nullable
- participant_action_commitment_id nullable
- reviewer_user_id nullable
- raw_units_verified
- compliance_status: verified_full | verified_partial | failed | insufficient_evidence | fraudulent | withdrawn
- verification_confidence
- reviewer_notes_private
- participant_visible_reason
- participant_visible_at nullable
- dispute_deadline_at nullable
- decided_at

CreditedActionUnit
- id
- enrollment_id nullable
- participant_action_commitment_id nullable
- purchase_envelope_type nullable
- purchase_envelope_id nullable
- source_feature: group_buying | pledge_swap | other_moral_trade
- source_commitment_id nullable
- participant_user_id
- action_template_id
- raw_unit_key
- action_window_start_at
- action_window_end_at
- raw_units_credited
- source_verification_decision_id nullable
- credited_to_settlement_id nullable
- de_duplication_status: pending | clear | duplicate_blocked | de_duplicated | credited | reversed
- duplicate_of_credited_action_unit_id nullable
- timestamps

Settlement
- id
- purchase_envelope_type: group_buy_round | crowdfunded_pledge_swap_lot | crowdfunded_pledge_swap_basket | crowdfunded_pledge_swap_basket_item | pledge_swap_agreement
- purchase_envelope_id
- round_id nullable
- lot_id nullable
- basket_id nullable
- basket_item_id nullable
- settlement_scope: round | lot | basket | basket_item | imported_pledge_swap | repair
- purchase_envelope_snapshot_hash
- raw_units_total
- adjusted_units_total
- participant_payout_total_minor
- gross_participant_payout_total_minor nullable
- tax_withholding_total_minor nullable
- provider_fee_total_minor nullable
- sponsor_match_used_minor
- ordinary_funder_charge_total_minor
- refund_release_total_minor
- platform_fee_total_minor nullable
- currency
- settlement_status: draft | computed | approved | executed | failed
- public_report_json
- calculation_input_hash
- calculation_output_hash
- timestamps

ParticipantPayout
- id
- settlement_id
- enrollment_id nullable
- participant_action_commitment_id nullable
- consideration_obligation_id nullable
- lot_id nullable
- basket_item_id nullable
- raw_units_verified
- final_additionality_probability
- final_verification_confidence
- final_moral_impact_weight
- final_persistence_multiplier
- adjusted_units_final
- payout_amount_minor
- gross_payout_amount_minor nullable
- tax_withholding_amount_minor nullable
- provider_fee_amount_minor nullable
- platform_fee_amount_minor nullable
- rounding_delta_minor nullable
- currency
- payout_destination_ref_snapshot nullable
- payout_destination_verified_at nullable
- payout_retry_after nullable
- payout_expires_at nullable
- payout_failure_reason_redacted nullable
- unclaimed_property_status: not_applicable | pending_review | reportable | remitted | blocked | dev_waived nullable
- payout_status: pending | held | paid | failed | expired | cancelled
- payout_provider_ref nullable

FunderSettlementLineItem
- id
- settlement_id
- pledge_id
- is_eligible_for_charge
- ineligible_reason nullable
- adjusted_units_funded
- charge_amount_minor
- platform_fee_amount_minor nullable
- provider_fee_amount_minor nullable
- release_amount_minor
- rollover_amount_minor
- effective_cost_per_adjusted_unit_minor nullable
- currency
- timestamps

SponsorSettlementLineItem
- id
- settlement_id
- sponsor_matching_pool_id
- is_eligible_for_match
- ineligible_reason nullable
- adjusted_units_matched
- match_amount_minor
- reserve_amount_used_minor
- currency
- timestamps

FundingSettlementLineItem
- id
- settlement_id
- purchase_envelope_type
- purchase_envelope_id
- funding_source_commitment_id
- funding_source_type: ordinary_funder_pledge | crowdfunded_micro_pledge | standing_microfund_allocation | sponsor_matching_pool | sponsor_gap_fill | platform_reserve | dev_simulated_reserve
- funding_source_id
- is_eligible_for_charge_or_use
- ineligible_reason nullable
- amount_authorized_minor
- amount_reserved_minor
- amount_charged_or_used_minor
- amount_released_minor
- rollover_amount_minor nullable
- platform_fee_amount_minor nullable
- provider_fee_amount_minor nullable
- effective_cost_per_adjusted_unit_minor nullable
- funded_consideration_obligation_id nullable
- funded_adjusted_units nullable
- currency
- calculation_input_hash nullable
- calculation_output_hash nullable
- timestamps

AuditEvent
- id
- actor_user_id nullable
- entity_type
- entity_id
- action
- before_json_redacted nullable
- after_json_redacted nullable
- before_hash nullable
- after_hash nullable
- redaction_policy_version
- created_at


DomainEventOutbox
- id
- aggregate_type: purchase_envelope | funding_source | participant_action_commitment | consideration_obligation | settlement_plan | payment_operation | donation_operation | ledger_transaction | evidence_submission | dispute | other
- aggregate_id
- purchase_envelope_type nullable
- purchase_envelope_id nullable
- event_type
- event_version
- event_payload_json_redacted nullable
- event_payload_hash nullable
- redaction_policy_version
- idempotency_key unique
- occurred_at
- available_for_dispatch_at nullable
- dispatch_status: pending | dispatched | retryable | failed | cancelled | quarantined
- consumer_status_json_redacted nullable
- attempts
- last_error_redacted nullable
- locked_by nullable
- locked_at nullable
- dispatched_at nullable
- timestamps

Dispute
- id
- round_id nullable
- purchase_envelope_type nullable
- purchase_envelope_id nullable
- enrollment_id nullable
- participant_action_commitment_id nullable
- pledge_id nullable
- micro_pledge_id nullable
- consideration_obligation_id nullable
- opened_by
- dispute_type
- status: open | under_review | resolved | rejected
- blocks_settlement
- claim_text_private
- participant_visible_summary nullable
- resolution_text_private nullable
- public_resolution nullable
- timestamps

PaymentOperation
- id
- settlement_id nullable
- purchase_envelope_type nullable
- purchase_envelope_id nullable
- funding_source_commitment_id nullable
- funding_source_type nullable
- funding_source_id nullable
- consideration_obligation_id nullable
- pledge_id nullable
- micro_pledge_id nullable
- standing_microfund_allocation_id nullable
- funder_settlement_line_item_id nullable
- funding_settlement_line_item_id nullable
- sponsor_matching_pool_id nullable
- sponsor_settlement_line_item_id nullable
- payout_id nullable
- pledge_swap_donation_operation_id nullable
- operation_type: authorize | capture | release | payout | refund | rollover | charitable_donation
- amount_minor
- currency
- provider_name
- provider_operation_ref nullable
- idempotency_key unique
- status: pending | succeeded | failed | retryable | cancelled
- last_error nullable
- timestamps

PaymentProviderEvent
- id
- provider_name
- provider_event_id unique
- event_type
- provider_event_created_at nullable
- signature_verification_status: not_required | pending | verified | failed | replay_detected
- received_signature_hash nullable
- payload_json_redacted
- payload_hash nullable
- received_at
- processed_at nullable
- processing_status: pending | processed | ignored | failed | retryable
- related_payment_operation_id nullable
- last_error nullable

LedgerTransaction
- id
- transaction_type: reserve_funding | authorization_record | capture | release | rollover | payout | charitable_donation | sponsor_match | sponsor_gap_fill | microfund_allocation | platform_fee | shortfall | adjustment
- currency
- related_round_id nullable
- related_settlement_id nullable
- related_payment_operation_id nullable
- idempotency_key unique nullable
- memo_private nullable
- created_by nullable
- created_at

LedgerAccount
- id
- round_id nullable
- owner_user_id nullable
- account_type: participant_payout_reserve | conditional_funder_authorization | sponsor_match_reserve | sponsor_gap_fill_reserve | microfund_pool_balance | charitable_donation_reserve | charitable_donation_payable | rollover_liability | participant_payable | provider_clearing | platform_shortfall | platform_fee_revenue | adjustment
- currency
- status: active | closed
- timestamps

LedgerEntry
- id
- ledger_transaction_id
- account_id
- direction: debit | credit
- amount_minor
- currency
- related_settlement_id nullable
- related_payment_operation_id nullable
- related_line_item_id nullable
- memo_private nullable
- created_at

NotificationPreference
- id
- user_id
- channel: in_app | email | sms | webhook | other
- notification_type nullable
- preference_status: allowed | muted | required_transactional_only
- consent_basis: user_opt_in | transactional_required | legal_required | admin_configured
- updated_at

NotificationLog
- id
- user_id
- round_id nullable
- enrollment_id nullable
- pledge_id nullable
- notification_type
- channel: in_app | email | sms | webhook | other
- template_key
- status: pending | sent | failed | suppressed
- metadata_json_redacted nullable
- sent_at nullable
- timestamps

RiskReview
- id
- entity_type: enrollment | pledge | payout | evidence | user | round
- entity_id
- risk_type: identity | sybil | payment | evidence | baseline | threat | abuse | compliance
- reviewer_user_id nullable
- status: pending | clear | blocked | requires_changes | escalated
- rationale_private
- created_at
- resolved_at nullable

ReviewQualityAudit
- id
- entity_type: enrollment | verification_decision | risk_review | adverse_decision | dispute | methodology_review | safety_review
- entity_id
- review_type: blind_review | second_review | random_sample | high_risk_sample | disagreement_review | calibration
- original_reviewer_user_id nullable
- audit_reviewer_user_id nullable
- blinding_applied
- outcome: pending | agrees | disagrees | corrected | escalated | training_needed | waived_dev_only
- notes_private nullable
- created_at
- resolved_at nullable

AIProcessingLog
- id
- entity_type: enrollment | verification_submission | verification_decision | risk_review | dispute | support_case | methodology_review | round
- entity_id
- processor_name
- processor_type: internal_model | approved_external_processor | rule_based | other
- purpose: summarization | risk_triage | verification_assistance | support_assistance | methodology_assistance | other
- input_redaction_policy_version
- prompt_or_request_hash nullable
- output_ref nullable
- output_hash nullable
- human_review_required
- status: pending | completed | failed | discarded
- created_at

MutationIdempotencyRecord
- id
- actor_user_id nullable
- operation_type: pledge_authorization | enrollment_submit | evidence_upload | dispute_open | appeal_submit | payout_destination_submit | admin_approval | admin_override | other
- scope_entity_type nullable
- scope_entity_id nullable
- idempotency_key unique
- request_hash
- response_entity_type nullable
- response_entity_id nullable
- status: pending | completed | failed | expired
- expires_at nullable
- timestamps

TermsAcceptance
- id
- user_id
- round_id nullable
- entity_type: enrollment | pledge | sponsor_matching_pool | crowdfunded_pledge_swap_lot | crowdfunded_pledge_swap_basket | standing_microfund_pool | participant_proposal | admin_approval | payout_destination | other
- entity_id nullable
- terms_type: participant_terms | funder_terms | sponsor_terms | admin_terms | privacy_notice | payout_terms | other
- round_snapshot_hash nullable
- terms_snapshot_hash
- accepted_version
- request_context_hash_redacted nullable
- accepted_at
- revoked_at nullable
- revocation_reason_private nullable
- superseding_terms_acceptance_id nullable


UserComprehensionCheck
- id
- user_id
- purchase_envelope_type nullable
- purchase_envelope_id nullable
- entity_type: pledge | micro_pledge | standing_microfund_pool | enrollment | participant_action_commitment | donation_recipient_choice | payout_destination | participant_proposal | admin_approval | other
- entity_id nullable
- comprehension_check_type: funding_obligation | participant_action_obligation | stored_balance_or_wallet | donation_tax_receipt | public_identity_opt_in | evidence_burden | offset_claims | high_risk_admin | other
- prompt_snapshot_hash
- user_response_hash_redacted nullable
- result: passed | failed | skipped_not_required | waived_dev_only | support_review_required
- failed_reason_private nullable
- checked_at
- expires_at nullable
- timestamps

UserReceipt
- id
- user_id
- round_id nullable
- entity_type: pledge | enrollment | team_activation | crowdfunded_pledge_swap_lot | crowdfunded_pledge_swap_basket | standing_microfund_pool | microfund_allocation | donation_recipient_choice | participant_proposal | evidence_submission | verification_decision | settlement | payout | charitable_donation | dispute | appeal | terms_acceptance | other
- entity_id nullable
- receipt_type: commitment_summary | terms_acceptance | payment_authorization | evidence_submission | verification_result | settlement_statement | payout_statement | dispute_deadline | cancellation_release | other
- public_receipt_id
- receipt_snapshot_hash
- round_snapshot_hash nullable
- receipt_json_redacted
- created_at
- delivered_at nullable
- revoked_or_superseded_at nullable

EvidenceAccessLog
- id
- submission_id
- viewer_user_id
- access_reason
- action: view_metadata | view_private_evidence | download_private_evidence | redact | delete
- created_at

SafetyReview
- id
- entity_type: action_template | group_buy_round
- entity_id
- reviewer_user_id
- status: pending | approved | rejected | requires_changes
- rationale_private
- public_rationale nullable
- created_at

ImpactMethodologyReview
- id
- entity_type: action_template | group_buy_round
- entity_id
- reviewer_user_id
- status: pending | approved | rejected | requires_changes
- methodology_notes_private
- public_methodology_summary
- created_at

JurisdictionAvailabilityReview
- id
- entity_type: action_template | group_buy_round
- entity_id
- jurisdiction_scope
- reviewer_user_id nullable
- status: pending | supported | unsupported | requires_changes | dev_only
- rationale_private
- public_rationale nullable
- created_at

ProductionComplianceReview
- id
- entity_type: action_template | group_buy_round
- entity_id
- jurisdiction_scope nullable
- reviewer_user_id nullable
- review_type: labor_classification | tax_reporting | charitable_solicitation | payment_provider_acceptance | sanctions_aml | payout_legality | unclaimed_property | money_transmission_custody | privacy_security | other
- status: pending | approved | rejected | requires_changes | not_required | dev_only
- rationale_private
- public_rationale nullable
- created_at
- resolved_at nullable


ResearchDataUseReview
- id
- round_id nullable
- entity_type: group_buy_round | action_template | waitlist_control_followup | aggregate_report | other
- entity_id nullable
- use_type: administration | precommitted_additionality_estimation | public_research | external_evaluation | model_training | cross_round_analysis | other
- consent_requirement: not_required | existing_terms | separate_opt_in | prohibited
- privacy_review_status: pending | approved | rejected | requires_changes | not_required | dev_only
- reviewer_user_id nullable
- public_summary nullable
- rationale_private nullable
- created_at
- resolved_at nullable


OperationalPause
- id
- scope: global_group_buying | round | publication | funding | enrollment | evidence_upload | clearing | settlement | payout | notification
- round_id nullable
- status: active | lifted
- pause_type: publication | intake | money_movement | evidence_upload | notification | full
- reason_private
- public_message nullable
- created_by
- lifted_by nullable
- created_at
- lifted_at nullable

IncidentReport
- id
- round_id nullable
- incident_type: safety | privacy | security | payment | legal_compliance | participant_welfare | ai_processing | evidence | other
- severity: low | medium | high | critical
- status: open | contained | monitoring | resolved | postmortem_required | closed
- opened_by nullable
- owner_user_id nullable
- private_summary
- public_message nullable
- containment_action_private nullable
- linked_operational_pause_id nullable
- linked_payment_provider_event_id nullable
- linked_dispute_id nullable
- postmortem_private nullable
- created_at
- resolved_at nullable

DeadlineJob
- id
- round_id nullable
- job_type: launch_expiry | team_activation_expiry | verification_deadline | dispute_deadline | reauthorization | settlement_reminder | payout_reminder | evidence_retention | stale_job_escalation | other
- scheduled_for
- idempotency_key unique
- status: pending | running | succeeded | failed | retryable | cancelled
- attempts
- last_error_redacted nullable
- locked_by nullable
- locked_at nullable
- completed_at nullable
- timestamps

PrivacyErasureRequest
- id
- requester_user_id nullable
- subject_user_id nullable
- scope: baseline | evidence | payout_reference | kyc_tax_reference | review_rationale | all_supported
- status: pending | approved | rejected | in_progress | completed | partially_completed | blocked_by_legal_hold
- legal_hold_reason nullable
- public_status_summary nullable
- private_notes nullable
- created_at
- resolved_at nullable

ResearchDataUseConsent
- id
- user_id nullable
- round_id nullable
- enrollment_id nullable
- consent_scope: followup_survey | cross_round_analytics | publication | model_training | external_sharing | other
- consent_status: offered | accepted | declined | withdrawn | not_required_admin_only
- consent_terms_hash nullable
- accepted_at nullable
- withdrawn_at nullable
- private_notes nullable

DataRetentionAction
- id
- round_id nullable
- related_erasure_request_id nullable
- entity_type
- entity_id
- action_type: redact | delete_blob | delete_token | crypto_erase | tombstone | legal_hold | retention_extend
- status: pending | executed | failed | blocked_by_legal_hold | skipped
- before_hash nullable
- after_tombstone_hash nullable
- executed_by nullable
- executed_at nullable
- created_at

DataBackfillJob
- id
- job_type: schema_migration | pledge_swap_action_unit_backfill | ledger_account_backfill | retention_policy_backfill | other
- source_feature: group_buying | pledge_swap | other_moral_trade | platform
- target_entity_type
- status: pending | dry_run | running | succeeded | failed | retryable | cancelled
- dry_run_counts_json_redacted nullable
- reconciliation_summary_json_redacted nullable
- reconciliation_hash nullable
- idempotency_key unique
- started_at nullable
- completed_at nullable
- last_error_redacted nullable
- timestamps

ReconciliationRun
- id
- round_id nullable
- reconciliation_type: settlement_vs_ledger | ledger_vs_provider | credited_action_unit_dedup | pledge_swap_adapter | payout_reserve | backup_restore | other
- status: pending | running | passed | failed | retryable | waived_dev_only
- input_hash nullable
- result_summary_json_redacted nullable
- discrepancy_count nullable
- started_at nullable
- completed_at nullable
- timestamps

BackupRestoreCheck
- id
- scope: ledger | settlement | audit_metadata | credited_action_units | evidence_metadata | provider_events | full_group_buying
- environment: development | staging | production
- status: pending | passed | failed | waived_dev_only
- backup_taken_at nullable
- restore_tested_at nullable
- result_summary_json_redacted nullable
- created_by nullable
- timestamps

Use JSON schema fields only where the action template genuinely requires flexible fields. Keep settlement-critical values as typed columns. Use database constraints or application validators for probability ranges, nonnegative quantities, status transitions, single-currency-per-round settlement, one active enrollment per user per round, no overlapping paid enrollments that would credit the same raw action units, one pledge-settlement line item per pledge per settlement, one sponsor-settlement line item per sponsor pool per settlement, one payout per enrollment per settlement, unique slugs, unique payment idempotency keys, unique payment provider event ids, balanced ledger transactions, ledger/settlement/payment reconciliation, clean-or-quarantined evidence scan states before reviewer access, jurisdiction/availability support for real-money actions, notification/risk-review foreign keys, canonical immutable round snapshot hashes, redacted audit/notification/provider-event payloads, deterministic decimal precision for adjusted-unit calculations, UTC deadline storage with display-timezone policy, state-machine transition constraints, selection-decision audit rows, related-party/AML review states, participant-welfare review states, request-rate/security controls where supported, credited-action-unit de-duplication keys, temporal ordering of UTC deadlines/action windows, append-only audit/ledger/review records, protected/tokenized sensitive storage references, production-compliance review states, safe migration/backfill records, periodic reconciliation records, backup/restore readiness checks, no-trade-baseline and impact-claims policy snapshots, funder-counterfactual disclosure fields, reviewer-quality audit records, incident-response records, anti-gaming/private-threshold policy references, public/private snapshot redaction constraints, public-content sanitization constraints, notification-preference constraints, research-data-use consent constraints, AI-processing/subprocessor audit records, mutation idempotency records with request-hash mismatch rejection, terms-acceptance proof records with non-mutating revocation semantics, payout-destination snapshot/retry/expiry records, fee/withholding gross-to-net reconciliation, behavior-change equivalence-group repeat controls, team-activation group thresholds and expiration constraints, activated-only clearing/settlement constraints, team-invite token hashing/revocation constraints, distinct-qualified-member threshold constraints, team-capacity reservation constraints, evidence integrity hashes/redaction provenance, cryptographic hash/HMAC algorithm and derivation-version metadata, sensitive-hash public-exposure controls, rollout-cap/risk-tier limits, accessibility policy references, adverse-decision review states, participant/funder interaction policy constraints, cross-feature credited-action-unit uniqueness across group-buying and pledge-swap agreements, and monetary integer-minor-unit fields.

3. Roles and permissions
Implement role-sensitive access:
- Public visitor: can view public rounds and public settlement reports.
- Authenticated funder: can pledge, view own pledge, cancel before capture if allowed.
- Authenticated participant: can apply, submit verification evidence, view own payout status.
- Verifier/reviewer: can review evidence and make verification decisions.
- Admin: can create templates, create rounds, approve rounds, clear rounds, compute/approve settlements, manage disputes.
- Sponsor: can create matching pool if admin-approved.
- Compliance/methodology reviewer: can approve jurisdiction availability, production-compliance reviews, and impact-methodology snapshots if the repository supports specialized reviewer roles; otherwise admins perform this under dual-control rules for production rounds.
- Operations reviewer: can view observability dashboards and retry safe jobs without gaining access to private evidence unless separately authorized.

Do not expose private evidence, payment references, baseline details, or anti-threat flags publicly. Access to private evidence must require a role-specific reason and create an EvidenceAccessLog entry. Funder, participant, sponsor, payout-destination, and admin terms shown at pledge/application/approval time must come from the frozen round snapshots and be acknowledged via TermsAcceptance records before authorization, enrollment, sponsor-pool activation, payout-destination use, launch approval, or settlement approval. Terms revocation or replacement must be exposed only through the relevant domain flow and must preserve the original immutable consent record for audit and dispute purposes. Enforce conflict-of-interest checks so users cannot make final review, verification, dispute, or settlement decisions on matters involving their own account, pledge, enrollment, payout, matching pool, or a declared close relationship. All mutation APIs and server actions must enforce authorization and recompute settlement-critical values server-side rather than trusting hidden form fields, client-side calculations, or URL parameters. They must also use CSRF/session protections, rate limits, and abuse throttles appropriate to the repository’s stack.
Funders and sponsors should see aggregate progress, aggregate reports, and their own financial line items, but not participant identities, private baseline data, individual evidence, or tools to choose or pressure specific participants unless the frozen participant/funder interaction policy explicitly permits it after legal, privacy, and welfare review. Public API serializers and server components must use an explicit allowlist for public round fields, and must never return private policy snapshots, raw canonical snapshot JSON with private sections, private anti-gaming thresholds, or protected-storage references by default.
Any AI-assisted reviewer, support, or admin workflow must show whether AI was used, must preserve human accountability for material decisions, and must not expose private data to unapproved processors. Evidence and user-submitted text passed through AI-assisted tooling must be sandboxed or otherwise treated as adversarial input rather than trusted instructions.
Review and verification interfaces should default to blinded or minimized context where feasible, and reviewer-quality audits should be available to authorized admins/compliance reviewers without exposing unnecessary private evidence or identity data.
Team invite and activation interfaces must not disclose team member identities, payment status, baseline data, or individual eligibility/risk states to other team members unless the frozen interaction policy explicitly permits opt-in disclosure. Invite URLs should be shown only as shareable tokens/links to the intended user, with revoke/report-abuse controls and no raw-token exposure in admin tables.
Material adverse decisions should expose non-sensitive participant/funder-visible reasons and route users to the frozen dispute or appeal path without revealing fraud heuristics, private reviewer notes, or other users’ data.
For production real-money rounds above a configurable risk or money threshold, require two distinct authorized reviewers for safety approval, launch approval, and settlement execution approval unless the repository already has an equivalent dual-control workflow.
High-risk admin actions must require step-up authentication or recent re-authentication where supported, and each step-up event should be auditable without logging authentication secrets. Emergency pauses may be applied by authorized admins under the frozen pause policy, but unpausing money movement or evidence access after a serious incident should require dual control for production real-money rounds.
For paid behavior-change rounds, require participant-welfare review for templates or rounds that may disproportionately attract financially vulnerable users, impose burdensome behavior changes, or use variable compensation/selection rules.

Standing microfund pools should be controlled only by the funder who owns them. Admins and automated allocation jobs may allocate from a standing pool only according to the funder's frozen constraints and must create receipts for each allocation. Participants should be able to choose a donation recipient only from approved lists and only for lots/basket items where the frozen terms allow participant recipient choice. Sponsors may create last-dollar gap-fill commitments only through admin-approved sponsor flows and may not choose, identify, or pressure individual participants. Participant-proposed lots must be visible only to the proposer and authorized reviewers/admins until converted into a reviewed public lot or basket.
Standing microfund pools should also support a funder-selected allocation review mode: immediate auto-lock, preview-then-lock after a notice window, or manual approval before each allocation. The default for production should be preview-then-lock or manual approval unless the user explicitly chooses auto-lock with clear caps and cancellation rules.

Public lot and basket pages should use anonymous participant supply by default. Funders see the action template, consideration type, aggregate funding state, aggregate verification outcome, and their own financial records; they do not see named participants, participant profiles, private baseline data, or participant-specific donation-recipient reasoning unless a reviewed opt-in disclosure policy explicitly permits it. Participants should see whether they are pre-accepted, invited, accepted, active, withdrawn, or replaced, and should never see funder identities or funding pressure copy except through aggregate state labels.

Age and consent rule:
- For paid behavior-change rounds, reject minors by default unless the repository already has a legally reviewed guardian-consent and payout-compliance flow. The seeded vegetarian diet-shift template should require adult participants.

4. Round lifecycle
Implement status transitions:

draft → under_review → funding/enrolling → ready_to_clear → active → verifying → settling → settled

Implement these transitions through a single state-machine service. Do not allow direct database status updates from route handlers, UI actions, background jobs, or admin scripts except through audited migration/repair tooling.

A round can launch only if:
- current time <= launch deadline,
- expected adjusted units from selected/eligible participants >= minimum_expected_adjusted_units,
- expected all-in cost per adjusted unit <= maximum_cost_per_adjusted_unit,
- authorized funding + matching pool is sufficient for expected payout/reserve,
- the participant-payout reserve is sufficient to cover maximum payout obligations for selected participants under the frozen terms, using only funds eligible to support guaranteed participant payouts,
- for crowdfunded pledge-swap lots, the charitable-donation reserve, participant-payout reserve, or mixed-consideration reserve is sufficient to cover the fixed consideration owed if the participant verifies the action; pending, expired, or settlement-stage conditional micro-pledges cannot be counted unless their conditions cannot reduce the owed consideration,
- for donation-consideration lots, the donation recipient is admin-approved, jurisdiction-supported, AML/sanctions-cleared or dev-waived, and frozen into the lot snapshot before participant acceptance,
- for participant donation-recipient choice, the selected recipient or fallback recipient satisfies each counted funder/microfund/sponsor recipient constraint; funding sources that did not consent to that recipient scope are excluded or released before launch/activation,
- the donor-of-record, donation-tax-receipt, restricted-fund, donation-failure, and charity-receipt policies are frozen before funding opens for donation-consideration lots or baskets,
- any standing microfund allocation in preview_then_lock or manual_approval_required mode has either been approved by the funder or has completed the frozen notice window before it is counted as locked funding,
- enabled feature modules and rollout caps permit the specific envelope type, consideration type, standing-pool behavior, donor-recipient-choice behavior, sponsor gap-fill behavior, and payment mode used by the round/lot/basket,
- a PurchaseEnvelopeRegistry registry row exists, has the correct envelope type/entity mapping, status category, currency, enabled module snapshot, and frozen policy-bundle reference, and reconciles with the envelope-specific table,
- required ParticipantActionCommitment records exist for every participant who could be asked to act, with accepted terms, action windows, privacy display policy, and de-duplication reservation state frozen before the participant begins,
- the frozen policy bundle has passed component compatibility checks and its component hashes match the envelope snapshot and any settlement/clearing plan hashes,
- the operational-efficiency review has approved any isolated single pledge-swap lot whose expected verification/payment/support overhead is high relative to expected impact, or the lot has been converted into a basket or batch round,
- for crowdfunded pledge-swap baskets, the basket target, per-item consideration, participant-selection/replacement policy, approved-recipient list, participant-recipient-choice policy, donation/payout reserve, and basket snapshot hash are frozen before participant selection or acceptance,
- standing microfund pool allocations counted toward funding are authorized under active, non-exhausted pools, fit the funder's frozen constraints, have not exceeded per-period or per-lot/per-basket caps, and have allocation receipts or pending allocation records,
- sponsor last-dollar gap-fill commitments counted toward clearing or reserve have triggered under the frozen threshold, have sufficient reserved funds or equivalent guarantee, and have clear AML/related-party/jurisdiction checks,
- participant-proposed lots or basket items have been converted into standardized reviewed lots/basket items before publication, funding, participant acceptance, or action start,
- payment authorizations counted toward launch are still valid or have been reauthorized,
- selected participants, funders, and sponsors have accepted the relevant frozen terms snapshots with TermsAcceptance records referencing the correct snapshot hashes,
- frozen group-buy validity mode and team-activation policy are present; any commitments counted toward launch, participant-payout reserve, expected adjusted units, or public activated progress are instant-valid or activated team-threshold commitments, not pending or expired team activations,
- frozen team activation effect, invite-token, distinct-qualified-member, and capacity-reservation policies are present; activation groups that reserve capacity or budget have reconciled reservations, while eligibility-only activation groups are not displayed as confirmed selections,
- frozen no-trade-baseline, funder-counterfactual, and impact-claims policies are present so public reporting cannot overstate net impact relative to the no-trade baseline,
- frozen hash/identifier policy is present, including public/private hash exposure rules, raw_unit_key derivation rules, and snapshot hash canonicalization/algorithm metadata,
- frozen platform-fee, provider-fee, tax-withholding, gross-vs-net-payout, and terms-revocation policies are present and consistent with participant-payout reserve accounting,
- frozen verification, dispute, reauthorization, settlement, payout, unclaimed-payout, reserve, shortfall, lifecycle, selection, participant-welfare, anti-gaming, adverse-decision, participant/funder interaction, security, timezone/display, retention/deletion, deadline-job, and notification terms are present,
- frozen receipt/proof policy, adverse-decision visibility-deadline policy, team-counter reconciliation policy, off-platform-circumvention policy, and unclaimed-property/abandoned-funds policy are present where applicable,
- frozen public-content sanitization, notification-channel preference, and research/control-data-use policies are present,
- frozen UTC deadlines and action windows pass temporal-order validation,
- team activation windows, if enabled, expire before the relevant enrollment/launch deadline and leave enough time for required risk, authorization, reserve, and selection checks before any participant action window begins,
- identity, Sybil, fraud-risk, payment-risk, AML, related-party, participant-welfare, adverse-decision, and jurisdiction/availability checks are clear or explicitly waived in development-only mode,
- required production-compliance reviews are approved or explicitly marked not_required/dev_only for the current mode and jurisdictions,
- production rollout caps and risk-tier limits for the round are configured and not exceeded, unless an approved dual-control override exists,
- impact-methodology and participant-welfare reviews are approved and frozen into the round snapshot,
- the frozen moral-view/cause-area summary is present, included in the public snapshot/export at a safe level of detail, and clearly labels moral-impact weights as protocol-relative rather than platform-endorsed universal moral truth,
- behavior-change equivalence-group, repeat-participation cooldown, and cross-template anti-threat policies are approved and frozen for behavior-change templates,
- ledger accounts for participant-payout reserve, funder authorizations, sponsor reserves, rollovers, and shortfalls have been created or mapped to existing ledger accounts,
- cross-round and cross-feature double-count checks are clear for selected paid participants, including conflicts with existing pledge-swap / moral-trade compensated commitments,
- any required migration/backfill jobs for cross-feature raw-action-unit de-duplication have passed dry-run and production reconciliation checks, or the feature remains disabled for affected templates/jurisdictions,
- for production real-money rounds, required backup/restore readiness checks and periodic reconciliation runs are current and passing under the frozen rollout policy,
- required invariant/property-based or deterministic invariant test suites for settlement, payment, ledger, lifecycle, and privacy/public-snapshot boundaries are present or explicitly waived in development-only mode,
- the round’s immutable template/formula/pricing/verification/lifecycle/selection/anti-gaming/adverse-decision/participant-funder-interaction/security/timezone snapshot has been created, stored as canonical snapshot JSON, and its round_snapshot_hash is computed from that canonical representation,
- safety review is approved,
- no active operational pause blocks launch, funding, enrollment, clearing, or money movement for the round,
- no unresolved high-severity or critical IncidentReport blocks launch, funding, enrollment, clearing, evidence intake, or money movement under the frozen incident policy,
- no unresolved safety/anti-threat/fraud flags block launch,
- required launch approvers have satisfied any configured step-up-authentication requirement,
- admin approves launch.

If oversubscribed, randomly assign eligible participants into:
- selected_paid group
- waitlist_control group

The waitlist/control group is used to improve additionality estimates. Make the randomization auditable to admins, obtain transparent follow-up consent, and make clear that waitlist/control participants are not being asked to perform the action without payment.

Before randomizing oversubscribed applicants, freeze or version the eligible applicant set, selection weights, randomization policy, and seed-commitment hash. After selection, store enough information to reproduce the result without exposing private applicant data publicly. Rerandomization or manual override must require an explicit audited reason and must not be used to shop for a preferred participant set.

Cancellation / failure path:
- If a round fails to launch by the deadline, release payment authorizations, mark enrollments as not selected, preserve the audit trail, and publish a short non-sensitive explanation if the round was public.
- If a team-threshold activation group fails to reach its required co-funder or co-participant count within the frozen activation window, expire the activation group idempotently, release or cancel pending authorizations, mark pending enrollments as expired/not selected, preserve the audit trail, and notify affected users without implying that anyone failed morally.
- If an activated team had reserved capacity, budget, or slots but later fails under a frozen cancellation or compliance policy before action begins, release the reservation through auditable ledger/state-machine operations and show users whether they are expired, waitlisted, or still selected.
- If an active round must be cancelled for safety, legal, payment, or integrity reasons, compute any owed partial payouts only under the frozen cancellation terms, release unused authorizations, and publish a non-sensitive cancellation report where appropriate.
- If a crowdfunded pledge-swap basket fails to fund by the deadline, release direct micro-pledges, release or restore standing microfund allocations to the funder's available budget where permitted, expire unused sponsor gap-fill commitments, do not invite participants to begin, and publish only a non-sensitive aggregate explanation if public.
- If one basket item fails before action begins, use the frozen basket replacement policy; do not silently substitute a different participant, charity, action obligation, or consideration amount after funders or participants accepted the snapshot.
- Status transitions that can affect money movement or participant obligations must be atomic and concurrency-safe.
- Cancellation and failed-launch handling must preserve participant-payout reserve accounting and must not spend reserve funds on non-reserve obligations before owed participant payouts are resolved.
- Notify affected funders, participants, sponsors, verifiers, and admins of failed launch, cancellation, reauthorization needs, verification deadlines, dispute windows, settlement approval, settlement execution, and payout status according to the frozen notification policy.
- DeadlineJob processing must call the state-machine or approved domain services, use stable idempotency keys, acquire a job lock or equivalent lease before execution, and record retryable failure state without duplicating user notifications, money movement, status transitions, or retention actions.
- TeamActivationGroup expiration and activation-window reminders must use the same DeadlineJob or equivalent locking/idempotency pattern; retries must not activate, expire, notify, authorize, release, or cancel the same activation group twice.
- Emergency pause/unpause actions must be performed through the state-machine or approved operational-pause service, produce append-only audit records, and preserve user-safe flows such as withdrawal, dispute intake, support contact, and required releases/refunds unless those specific flows are legally or technically unsafe.

5. Clearing engine
Create a service/module that:
- computes expected adjusted units for each eligible participant,
- ranks or selects participants according to expected adjusted units per expected payout, subject to fairness and template rules,
- checks funder constraints,
- checks sponsor matching rules,
- decides whether the round clears,
- produces a human-readable clearing explanation, including why the round did or did not clear and which constraints were binding.
- persists SelectionDecision rows for selected, waitlisted/control, not-selected, and rejected applicants, including the server-computed score or randomization batch used.
- validates instant-valid versus team-threshold status before using a pledge or enrollment in clearing: pending or expired team-threshold pledges/enrollments are excluded, activated team-threshold commitments are treated according to the frozen activation policy, and activation success/failure explanations remain aggregate and non-sensitive.
- applies the frozen team_activation_effect: eligibility_only groups enter later clearing without capacity promises; reserve_capacity_until_launch groups must hold reconciled capacity/budget reservations; activate_and_select_if_clear groups can become selected only in the same transaction that validates capacity, reserve, authorization, distinct-member, and compliance constraints.
- counts only qualified distinct members toward co-funder/co-participant thresholds and ignores blocked, duplicate, related-party-disqualified, expired, withdrawn, or invite-abuse-flagged members.
- for randomized oversubscription, freezes the eligible applicant set and seed commitment before selection, then records the revealed seed or reproducible randomness transcript in an access-controlled audit record after selection.
- recomputes or transactionally verifies team-threshold qualified-member counts from underlying member, pledge, enrollment, identity, authorization, and risk-review records before any activation decision; denormalized count fields are caches only.
- clears crowdfunded pledge-swap lots only when activated/instant-valid micro-pledges meet the frozen minimum consideration amount, provider-minimum policy, reserve policy, micro-funder count rule if any, participant eligibility rule, donation-recipient compliance rule, and action-window timing rule before the participant is asked to accept or begin the action.
- distinguishes “fully funded,” “participant accepted,” “active,” and “owed after verification” for pledge-swap lots. Fully funded means the micro-pledge side cleared; it does not by itself mean the participant has accepted, begun, verified, or earned the donation/payout.
- clears crowdfunded pledge-swap baskets when the basket-level funding target, minimum lot count, distinct-funder constraints, provider-minimum/batching constraints, sponsor gap-fill triggers, and reserve requirements are satisfied under the frozen basket policy.
- allocates standing microfund pools only into eligible lots/baskets that match the funder's frozen constraints, caps, and allocation strategy; allocation jobs must be idempotent and must not exceed the user's period budget under concurrent allocation attempts.
- applies standing microfund allocation review mode: auto_lock allocations may lock immediately under the user’s caps; preview_then_lock allocations notify the user and lock only after the frozen notice window; manual_approval_required allocations remain proposed until the funder approves.
- checks donation-recipient compatibility across participant-selected recipients, direct micro-pledge constraints, standing microfund constraints, sponsor gap-fill scope, and the frozen approved-recipient list before declaring a lot or basket funded.
- creates or updates ConsiderationObligation records at clearing/activation time for every fixed charitable donation, participant payout, mixed consideration, sponsor bonus, fee/withholding, and release/refund obligation that could later be earned or executed.
- creates or updates ParticipantActionCommitment records for each selected participant action before the participant is invited or asked to begin; action commitments, not UI status labels, are the bridge between selection, verification, credited action units, settlement, receipts, and double-count checks.
- updates the PurchaseEnvelopeRegistry registry status category atomically with envelope-specific lifecycle changes so dashboards, public listings, deadline jobs, and support tools cannot observe contradictory states.
- enforces feature-capability gates before clearing any optional module; disabled modules must return a non-sensitive not-available state rather than partially clearing.
- applies participant donation-recipient choice before action begins for lots/basket items whose recipient policy requires it, and freezes the selected recipient or fallback before participant acceptance becomes active.
- triggers last-dollar sponsor matching only when the frozen threshold is met; sponsor gap-fill activation must be atomic with reserve accounting and must not be represented as public impact separate from the verified pledge-swap action.
- routes participant-proposed lots through private review and standardization before clearing; raw proposals must never be directly matched to funders or displayed publicly.
- creates or updates a persistent SettlementPlan / clearing plan whose hashes bind selected participants, funding sources, recipient choices, consideration obligations, fees, donation/payout/release operations, and ledger entries for later approval.
- checks provider-fee ratio, platform-fee ratio, estimated verification/review burden, expected operator cost, and operational-efficiency thresholds before routing a lot or basket to launch; failures require batching, revised terms, or an explicit reviewed waiver.
- records FundingSourceRoutingDecision rows when direct micro-pledges or standing microfund allocations are routed into a lot, basket, successor envelope, or near-clearing item, with a user-visible explanation and frozen constraint hash.

Clearing should not merely count participants. It should optimize for expected adjusted impact units within budget and funder constraints. It should precompute or reserve intended raw-unit de-duplication keys where feasible so selected paid participants cannot later be credited for already-reserved overlapping raw action units, including raw units already claimed by existing pledge-swap / moral-trade agreements, and must fail closed if the shared registry or pledge-swap adapter has not been backfilled and reconciled for the relevant template/action window. Raw-unit de-duplication keys must be generated by the server under the frozen derivation policy and must be opaque or keyed so they cannot be reconstructed from public round data, participant-visible status pages, or predictable action-window metadata. It must also enforce behavior-change equivalence-group repeat caps and additionality penalties across related templates, not only exact template identifiers. It must separately verify participant-payout-reserve solvency and should distinguish guarantee tranches from settlement-stage conditional impact-purchase tranches. Team-threshold activation may increase pivotality and social proof, but it must be evaluated before the relevant action obligation begins; once a selected participant is activated and the round is active, their payout is governed by their own verified adjusted units and the frozen reserve policy, not by whether later co-participants or co-funders remain active. It must use the frozen round snapshot when clearing launched or active rounds. Clearing must enforce the single-currency rule unless explicit FX support exists, must exclude blocked identity/Sybil/fraud/payment-risk/AML/related-party/participant-welfare/jurisdiction cases, must verify that reserve-related ledger accounts reconcile to available funds, and must lock or version the round and selected enrollments so concurrent admin actions/jobs cannot select incompatible participant sets. Selection and pricing logic must not use protected attributes or sensitive proxies unless the frozen participant-welfare and legal review explicitly permits that use. Do not expose exact selection scores, anti-gaming thresholds, or risk heuristics to participants or funders when disclosure would materially increase baseline manipulation, fraud, or threats; provide safe public explanations and participant-visible reasons instead.
Automated clearing/risk rules may reject or hold obviously ineligible or unsafe cases only under the frozen automation policy. Other material adverse selection, rejection, or payout-affecting decisions should create adverse-decision review or appeal records before finalization.

6. Verification
Implement verification workflows:
- Participants can submit evidence according to the template’s verification schema.
- The round can require daily check-ins, prompted check-ins, receipts/photos, final declaration, or manual attestations depending on verification_standard.
- Participants must be able to withdraw for health, safety, emergency, or personal reasons without punishment beyond losing payment for unverified units. Allow partial payment for verified partial units when the template permits it.
- For single-participant pledge-swap lots, participant identity, story, charity choice, baseline summary, and action status are private by default. Public participant stories or identified case studies require a separate post-settlement opt-in, safety/privacy review, and revocable-for-future-use publicity record; refusing publicity must not affect payout, donation, selection, or verification.
- Verification decisions should attach to ParticipantActionCommitment records and then create CreditedActionUnit records. A round-specific enrollment or basket item may display the result, but it must not be the only source of truth for verified action obligations.
- Store private evidence using the repository’s private-file mechanism if one exists; otherwise implement a clearly marked private-storage abstraction with signed URLs, access logging, and retention/deletion hooks.
- Validate evidence uploads before storage or reviewer access: enforce file size/type limits, scan/quarantine suspicious files where supported, strip unnecessary EXIF/location metadata where appropriate, sanitize previews, and avoid exposing original file URLs directly to browsers. Participants should be prompted to redact unrelated third-party personal data before upload where feasible, and reviewer tools should support redaction/tombstoning of unnecessary third-party data discovered after upload.
- Compute integrity hashes for original uploaded evidence and for sanitized/redacted derivatives where feasible. Redaction or metadata-stripping should create a derivative record rather than silently replacing the original audit reference; access to the original should remain private and retention-limited. Evidence hashes are private by default; if a public proof or public report needs an evidence-derived identifier, generate a separate public-safe identifier that cannot be used to test guessed evidence contents or correlate the same evidence across contexts.
- AI-assisted evidence summarization or verification triage must not process private evidence through unapproved external processors, must not trust prompt-like content embedded in evidence, and must route material verification denial, fraud marking, or payout holds through the frozen adverse-decision policy.
- Evidence and baseline-data retention must follow the frozen retention policy. When retention expires and no dispute, legal hold, payment-compliance need, or safety investigation requires retention, delete or crypto-erase private payloads and leave only redacted/tombstoned audit references.
- Enforce frozen verification submission deadlines and any frozen grace periods. Late evidence should be accepted only under the frozen policy or through a documented dispute/appeal path. Deadlines must be enforced by UTC instants while displaying localized times from the frozen display-timezone policy.
- Do not present diet or behavior-change rounds as medical advice. Use a brief health/safety notice, collect the minimum health-related data necessary for eligibility and safety, and permit no-questions withdrawal where disclosure would be unnecessary or privacy-invasive.
- Do not verify or pay the same raw action unit twice across overlapping paid rounds; verification must check for duplicate credited action windows and either block duplicates or de-duplicate credited units under the frozen policy.
- Verification decisions that create payable units must create or update CreditedActionUnit records with stable raw_unit_key values before settlement, and duplicate/overlapping credited units must be blocked, de-duplicated, or explicitly reversed under the frozen double-count policy. The check must include other group-buying rounds and existing pledge-swap / moral-trade agreements that compensate the same participant/action/window.
- Reviewers enter raw_units_verified and verification_confidence. Reviewer assignment should apply identity/context blinding where feasible, and high-risk or sampled verification decisions should create ReviewQualityAudit records for second-review, disagreement resolution, or calibration.
- If verification denial, fraud marking, or payout hold materially affects a participant, provide a non-sensitive participant-visible reason and the frozen dispute/appeal option unless the frozen low-risk automation policy explicitly permits automatic finalization.
- Evidence-submission and verification-decision flows should create user-facing receipts/proofs with server timestamps, redacted evidence hashes or public receipt identifiers, and relevant dispute/appeal deadlines. The dispute deadline should be computed from the participant-visible decision time under the frozen policy.
- The system computes final adjusted units:

final_adjusted_units =
raw_units_verified
× final_additionality_probability
× verification_confidence
× moral_impact_weight
× persistence_multiplier

For crowdfunded pledge-swap lots, verification must also determine whether the frozen action obligation was satisfied. A fixed-consideration lot may use adjusted units for impact reporting while using a fixed donation/payout settlement rule, e.g. “if the participant verifies at least the frozen 2-day no-meat obligation, execute the $50 charity donation; if partial completion is permitted, pro-rate only according to the frozen partial-completion policy.” The platform must not let admins retrospectively convert a fixed pledge-swap consideration into a lower payment because the adjusted-unit estimate changed after the participant acted.

Verification decisions should transition the relevant ConsiderationObligation records from reserved to earned, partially_earned, or released under the frozen trigger policy. Settlement should execute those obligations; it should not infer earned donations or payouts solely from UI status labels.

For crowdfunded pledge-swap baskets, verification should be itemized per participant/basket item and then aggregated for reporting. A basket may replace non-started participants only under the frozen replacement policy; after action begins, each participant's verified outcome controls the owed consideration for that item under the frozen terms. Donation-recipient choices must not be changed after action begins except under the frozen fallback/compliance policy.

For the first seeded template, implement a vegetarian diet-shift template:
- raw unit: avoided meat/fish meal
- eligibility: adult participant by default; not vegetarian/vegan in last 90 days; baseline meat/fish meals above configured threshold; no public threat/coercive framing; no suspicious baseline increase after round announcement; participant sees a health/safety withdrawal notice before applying
- verification: check-ins, final declaration, optional receipts/photos, reviewer decision
- methodology: define how material substitutions or negative spillovers, such as replacing avoided meat/fish meals with other animal products if relevant to the template’s moral theory, affect raw units, moral-impact weights, exclusions, or limitations reporting.

7. Additionality model
Do not rely only on self-attestation. Implement:
- baseline behavior fields,
- pre-campaign baseline date,
- repeat-participation penalty,
- additionality_probability,
- additionality_class A/B/C/rejected,
- control/waitlist comparison fields at settlement.

Control/waitlist data can update aggregate additionality estimates only according to precommitted settlement rules in the frozen round snapshot. Do not let admins arbitrarily use control-group outcomes after the fact to deny individual participants payment for units that were valid under the round’s precommitted rules. Participant-facing terms must disclose whether aggregate additionality updates can affect individual payout, funder charges, public impact reporting, or only future priors.

Waitlist/control participation must be non-deceptive. Applicants assigned to waitlist/control should be told their status, should not be instructed to perform the action as an unpaid control condition, and should be able to opt into follow-up surveys separately from paid participation.

For crowdfunded pledge-swap baskets and participant-proposed lots, additionality priors must account for proposal-source effects, repeat-participation incentives, donation-recipient choice effects, and whether participants may have performed the action anyway for the selected charity. Standing microfund pools must not be reported as additional impact by themselves; only verified settled lots/basket items generate adjusted-unit claims.

Admin/reviewer can manually adjust additionality probability with private notes, but all changes must create AuditEvents.

8. Anti-threat design
Implement strong anti-threat and misuse controls:
- Only admins can create action templates and rounds.
- Every action template and public round must pass a safety review before publication. Reject templates or rounds that facilitate illegal conduct, coercion, harassment, discrimination, self-harm, medical-risk behavior, political vote-buying, evasion of platform rules, or coordination toward clearly harmful ends.
- Every action template and public round must pass a methodology review before publication, covering raw-unit definitions, baseline logic, additionality priors, moral-impact weights, persistence multipliers, uncertainty presentation, and public methodology copy.
- Every paid behavior-change template and public round must pass participant-welfare review before publication, covering compensation fairness, burden, vulnerability risks, protected-attribute/proxy use, withdrawal safety, and whether the template could create exploitative incentives.
- Users cannot create custom “pay me not to do harm” offers.
- Reject or flag participants who frame participation as a threat, e.g. “pay me or I will eat more meat.”
- Baseline should be based on behavior before round announcement where possible.
- Do not publicly disclose exact baseline thresholds, scoring weights, or anti-threat triggers if doing so would encourage users to worsen their baseline, manufacture eligibility, or phrase threats more carefully.
- Flag sudden baseline worsening after the round was announced.
- Cap or decay repeat participation in the same “stop bad behavior” template.
- Apply repeat caps, cooldowns, and additionality penalties across equivalent or near-equivalent behavior-change templates, not merely within the exact template slug or ID.
- Use public copy like “sponsored behavior-change challenge,” not “pay people not to harm.”
- Participant-proposed lots must be private by default and reviewed for threat framing, baseline manipulation, coercion, self-harm, medical risk, illegal conduct, discrimination, and off-platform-circumvention before any public lot or basket can be created from them.
- Donation-recipient choice must not be used to route money to participant-controlled, related-party, extremist, fraudulent, sanctioned, or otherwise ineligible organizations; related-party and AML/sanctions checks apply to donation recipients and participant-selected charities.
- Sponsor gap-fill copy should emphasize coordination and completion of a pre-reviewed pledge-swap lot, not pressure on named participants or moral blame for non-funders.

Add an anti-threat flagging function and admin review UI.

9. Payments / pledge abstraction
Use existing payment rails if present. Otherwise create a PaymentProvider interface:

- createAuthorization(user, amount_minor, currency, metadata)
- captureAmount(authorizationId, amount_minor, currency, metadata)
- releaseAuthorization(authorizationId, metadata)
- createPayout(user, amount_minor, currency, metadata)
- createCharitableDonation(donationRecipient, amount_minor, currency, metadata)
- refundOrRelease(user, amount_minor, currency, metadata)

Provide:
- SimulatedPaymentProvider for development/testing.
- StripePaymentProvider only if Stripe is already present/configured in the repo; otherwise leave a clean adapter stub and docs.

Do not claim real escrow if not legally/technically implemented. UI should say “authorized pledge” or “payment authorization” unless the codebase truly has compliant escrow.
Real-money flows must be behind an explicit production feature flag or configuration gate. If the simulated provider is active, the UI and seed data must clearly indicate development/simulation mode and must not present simulated authorizations or payouts as real money movement.

Do not assume card/payment authorizations last for the full round duration. Store authorization expiry, reauthorize before launch or settlement when needed, and exclude expired or failed authorizations from launch solvency unless a compliant escrow/custody flow has already captured reserved funds.
For team-threshold pledge activation, pending authorizations may be created only under the frozen payment/activation policy; they must be labeled pending, excluded from participant-payout reserve and launch solvency until activated, and released idempotently if the team activation group expires.
For crowdfunded pledge-swap lots, micro-pledges may be authorized individually, accumulated through an internal wallet/credit balance where legally supported, or backed by a sponsor/platform reserve under the frozen policy. The UI must distinguish micro-pledges that are merely authorized from funds that are actually captured, reserved, or donated. Donation-consideration settlement must create a PledgeSwapDonationOperation or equivalent donation-provider operation and must reconcile it to the settlement line items, ledger entries, and donation receipt records. If the real provider cannot economically process sub-dollar contributions, production UI must enforce the configured minimum or require wallet batching rather than silently failing or hiding fees.

Standing microfund pools should use the same payment abstraction but may require a wallet, internal balance, batched authorization, periodic capture, or provider-supported microtransaction mode. The system must not create a provider call for every $0.50 allocation if the configured provider minimum/fee policy makes that unsupported. Allocation, capture, release, and period-budget reset must be idempotent and ledger-reconciled.
If wallet or stored-balance support is not legally/compliance approved, standing microfund pools should be implemented as allocation preferences backed by provider authorizations, sponsor reserves, or periodic captures, not as user-owned stored value. The UI must disclose whether money has actually been charged, merely authorized, internally allocated, or only reserved by policy.

For micro-pledges and standing-pool allocations, enforce the frozen fee-ratio policy before authorization/capture. If provider fees or platform fees would exceed the user's accepted ratio or the envelope's operational-efficiency policy, the system must batch the charge, wait for additional allocations, route to an eligible basket, increase the minimum contribution under new consent, or decline the allocation. Do not hide uneconomic micro-payment fees inside impact-unit pricing or charitable-donation labels.

Last-dollar sponsor gap-fill must be represented as a sponsor reserve, sponsor matching pool, or SponsorGapFillCommitment with stable idempotency keys and line items. Triggering gap-fill should be atomic with basket/lot clearing and must be safe on retry.


Payment execution requirements:
- All provider calls must use stable idempotency keys recorded in PaymentOperation.
- Provider webhooks or asynchronous payment events must be persisted in PaymentProviderEvent and processed idempotently; duplicate provider events must not change balances twice.
- Provider events must be applied through monotonic payment state transitions. Out-of-order provider events, stale provider timestamps, or provider states that conflict with already-executed ledger/payment operations must not regress local state and must create reconciliation diagnostics when ambiguous.
- Verify provider webhook signatures and timestamp tolerances before processing events. Events with failed signature verification, stale timestamps, unknown providers, or detected replays must be marked failed/quarantined and must not mutate PaymentOperation, LedgerTransaction, LedgerEntry, settlement, or user-visible payment state.
- Settlement execution should use a transaction/outbox pattern where possible: persist intended PaymentOperations first, then execute provider calls, then record provider results.
- Retrying settlement execution must be safe. It must not double-capture, double-release, double-refund, or double-pay.
- Store and calculate all money amounts in integer minor units with explicit currency; only format decimals in the UI.
- Enforce one settlement currency per round unless an explicit FX adapter with frozen exchange-rate snapshots is implemented and tested.
- Keep participant-payout reserve funds segregated in the ledger from conditional bonus/impact-purchase funds, even if the simulated provider represents both with internal balances.
- Use double-entry ledger entries for internal accounting of reserve funding, captures, releases, rollovers, shortfalls, platform fees, and participant payables. Payment provider success/failure should update provider-operation state and then reconcile to ledger entries; it should not be the only accounting record.
- Store only tokenized payment-provider references and protected payout/KYC/tax references in group-buying records. Raw payment instruments, bank details, government IDs, and KYC files must stay inside the payment/compliance provider or the repository’s compliant vault/storage layer. Provider credentials, webhook secrets, encryption keys, and signing keys must be loaded only from approved server-side secret stores or environment configuration, never from client code, seed data, snapshots, logs, or ordinary database columns.
- Payout-destination changes must be versioned and risk-reviewed. Settlement should snapshot the verified payout destination used for each ParticipantPayout, and failed/unclaimed payout retries, holds, expiries, or destination changes must follow the frozen unclaimed-payout policy.
- Fees and withholding must be applied only according to the frozen fee/withholding policies. The provider-facing payout amount should be the computed net amount, while gross payout, withheld/remitted amounts, platform fees, provider fees, and rounding deltas remain visible in participant dashboards where legally appropriate and reconcilable in ledger entries.
- For real payouts, document production requirements for KYC, tax reporting, AML, sanctions screening, labor/gig-work classification, charitable solicitation/fundraising rules, payout-country restrictions, chargeback/reversal handling, negative-balance/shortfall handling, support escalation, and payment-provider terms. Keep the simulated provider usable in development.
- For unclaimed payouts, abandoned balances, failed payout destinations, or unreleased user funds, document whether the jurisdiction requires escheatment, reporting, remittance, renewed contact attempts, or continued liability accounting, and keep affected balances segregated until the frozen policy resolves them.

10. Settlement engine
Create deterministic settlement calculation:
- Sum raw verified units from CreditedActionUnit records that are clear, not duplicate-blocked, not reversed, not already consumed by another settlement or pledge-swap agreement, and eligible under the frozen double-count policy.
- Include only instant-valid or activated team-threshold pledges, enrollments, and credited units. Pending, expired, cancelled, or blocked activation groups must not create funder charges, participant payouts, public adjusted-unit claims, or settlement line items except for explicit release/cancellation records.
- Apply additionality, verification confidence, moral impact weight, persistence multiplier.
- Compute each participant payout:

participant_payout_minor =
min(participant_payout_cap_minor, unit_price_minor × final_adjusted_units)

Use deterministic decimal precision and rounding rules specified in the frozen settlement formula snapshot.

- For fixed-consideration pledge-swap lots and baskets, settlement must separately compute: fixed consideration earned/executed, verified raw units, adjusted impact units for reporting, and any optional net-impact estimate. Do not derive the donation/payout amount from adjusted units unless the frozen lot/basket explicitly uses a per-unit formula rather than fixed consideration.
- Compute total payout in integer minor units and reconcile rounding deltas.
- Compute gross participant payout, legally required tax or compliance withholding, explicitly accepted participant-side fees, provider fees, platform fees, and net provider payout as separate deterministic line items. These line items must reconcile to ParticipantPayout rows, Settlement totals, LedgerEntry rows, and PaymentOperation rows.
- Check the participant-payout reserve before execution; if reserve funds are insufficient, block settlement execution and require an explicit admin/compliance resolution rather than silently reducing owed participant payouts.
- Check that platform fees and provider fees are funded from the frozen fee source and not from funds reserved for gross participant payout obligations unless the frozen terms explicitly allow that allocation without reducing validly owed gross payouts.
- Apply the frozen funding-shortfall and chargeback/reversal policy. Do not reduce or claw back participant payouts that are validly owed under the frozen terms because a funder authorization, capture, or post-settlement payment later fails.
- Apply sponsor matching according to match rules and create SponsorSettlementLineItem rows.
- Charge ordinary funders pro rata among eligible pledges, respecting:
  - amount_authorized,
  - max_cost_per_adjusted_unit,
  - minimum_total_adjusted_units_required,
  - accepted additionality classes,
  - accepted verification standards.
- Release unused authorizations or mark for rollover according to refund_preference, but only if the funder explicitly accepted that rollover/donation preference and the successor use satisfies the frozen refund policy; otherwise release the unused amount.
- Produce public_report_json.
- Produce ParticipantPayout rows, FunderSettlementLineItem rows, and SponsorSettlementLineItem rows before execution.
- For crowdfunded pledge-swap lots, produce CrowdfundedPledgeSwapMicroPledge settlement line items or equivalent per-micro-pledge FunderSettlementLineItem records, plus PledgeSwapDonationOperation records for charitable-donation consideration, before any capture, release, payout, or donation execution.
- Settlement should consume ConsiderationObligation records created at clearing/activation/verification time and reconcile each obligation to its funding sources, ledger entries, payment/donation operations, user receipts, and public-report aggregates.
- For donation-consideration lots and baskets, settlement must apply the frozen donor-of-record and tax-receipt policy. Do not issue or imply personal donation receipts to micro-funders unless the configured charitable-donation provider and legal review support that exact donor-of-record treatment.
- For fixed donation-consideration lots, compute whether the frozen action obligation was verified and then execute the frozen donation amount, partial donation amount, or cancellation/release outcome exactly as specified in the lot snapshot. Do not recompute the participant's promised charitable consideration from mutable template settings or post hoc admin preferences.
- For crowdfunded pledge-swap baskets, compute each basket item independently, then aggregate basket totals. Create per-item settlement rows or equivalent auditable references so one participant's failure, dispute, or donation hold does not obscure other verified basket items.
- For standing microfund pool allocations, create allocation settlement line items showing which pool funded which lot/basket, the amount charged or released, remaining period budget, and receipt identifiers. Do not charge beyond the funder's frozen cap even if the basket overfills.
- For participant donation-recipient choice, settlement must use the frozen selected recipient or frozen fallback; it must not substitute a different charity because it is more convenient after verification.
- For last-dollar sponsor matching, apply sponsor gap-fill after ordinary micro-pledges reach the frozen threshold and before declaring the lot/basket failed for underfunding, if and only if the sponsor commitment is active, reserved, jurisdiction-supported, and not expired.
- ParticipantPayout rows must snapshot the verified payout destination reference and any payout retry/expiry policy needed for failed or unclaimed payouts before payout execution begins.
- Mark credited action units as consumed by the settlement atomically with ParticipantPayout creation so retrying settlement cannot consume or pay the same raw action units twice.
- Produce calculation_input_hash and calculation_output_hash so admins can confirm that the approved settlement is the one being executed, and include the frozen round_snapshot_hash, deterministic decimal precision, and UTC deadline policy in the hashed input.
- Produce idempotent PaymentOperation records for captures, releases, rollovers, and payouts.
- Produce LedgerTransaction rows and balanced LedgerEntry rows for reserve use, funder charges, sponsor matches, participant payables, platform fees, releases, rollovers, refunds, and shortfalls; settlement execution must fail closed if ledger entries do not balance per LedgerTransaction or do not reconcile to line items.
- Produce or update UserReceipt records for affected funders, participants, and sponsors after settlement approval/execution, release, payout attempt, payout failure, or cancellation, using redacted receipt data and public receipt identifiers safe for user-facing support.
- Produce or reference the approved SettlementPlan, and fail closed if the plan hash, funding-source set, recipient-compatibility check, fee-ratio check, verification-burden check, credited-action-unit set, or consideration-obligation set no longer matches the state being executed.

Settlement must be previewable by admins before execution. Recomputing a draft preview should be deterministic from the frozen snapshot and verification decisions. Executing an approved settlement should be a separate explicit admin action requiring any configured step-up authentication for production real-money rounds. Settlement approval and execution must use row locks, version checks, or the repository’s equivalent concurrency-control pattern to prevent two workers/admins from executing incompatible settlement plans. Settlement execution must respect frozen dispute windows and must block or isolate line items affected by open disputes, fraud holds, payment-compliance holds, chargeback/shortfall holds, adverse-decision appeals, or conflict-of-interest review holds according to the frozen settlement policy. Settlement execution must also emit reconciliation diagnostics comparing aggregate Settlement totals, line-item totals, LedgerEntry totals, PaymentOperation totals, and provider webhook outcomes.
Recurring reconciliation runs should re-check settlement, ledger, provider, payout-reserve, and credited-action-unit consistency after asynchronous provider events, chargebacks, reversals, retention actions, and repair operations. Production settlement or cap increases should be blocked when required reconciliation runs are stale or failed under the frozen rollout policy.

11. Public reporting
Each settled round gets a public report page:
- applicants
- eligible participants
- selected paid participants
- waitlist/control participants
- verified full completions
- verified partial completions
- failures / insufficient evidence
- raw units
- adjusted impact units
- fixed consideration earned/executed for pledge-swap lots and baskets, reported separately from adjusted impact units and separately from optional net-impact estimates
- participant payout total, distinguishing gross payout, withholding, fees, and net payout where legally and privacy appropriate
- sponsor match used
- ordinary funder charges
- instant-valid versus team-threshold activation counts, including activated, expired, and cancelled team groups where safe to report
- activation-window conversion rates, suppressed or coarsened where small cells or invitation patterns could identify users
- unused funds released or rolled over
- estimated cost per adjusted unit
- methodology/formula version
- public methodology summary for raw units, additionality, impact weights, persistence multipliers, and material substitution/spillover handling, with gaming-enabling thresholds or heuristics redacted or summarized when required by the frozen anti-gaming policy
- protocol-relative moral-view/cause-area summary explaining whose moral valuations the impact methodology is intended to serve, without presenting those valuations as the platform's universal moral view
- no-trade-baseline and impact-claims summary distinguishing verified adjusted units purchased from estimated net social impact where funder-side counterfactual information, substitution effects, and methodology support permit that estimate
- aggregate funder-counterfactual summary, suppressed or omitted where sample size or privacy risk is too high
- uncertainty or confidence summary where available
- limitations statement
- offset/moral-licensing disclaimer when relevant, stating that funding verified actions does not by itself offset or permit the funder's own behavior unless the envelope is an approved offset template
- public-progress suppression method used for privacy-sensitive lots or baskets, described at a safe aggregate level
- frozen round snapshot hash, or a short public identifier derived from it, when this is safe to expose
- public round snapshot or redacted export, excluding private anti-gaming, fraud/risk, security, and protected-threshold policies
- public-safe snapshot/hash identifiers only; no raw_unit_key values, evidence hashes, private HMACs, sensitive request hashes, or internal protected-reference hashes
- timezone used for displayed deadlines and action window
- crowdfunded pledge-swap lot outcomes, including total micro-funders, total authorized, total charged, total released, total donated or paid, donation recipient public name if safe, action obligation verified, and whether the lot was fully funded, expired, cancelled, or settled
- micro-pledge distribution only in aggregate/suppressed form; no public list of tiny funders unless each funder explicitly chose public attribution and small-cell/privacy policy permits it
- crowdfunded pledge-swap basket outcomes, including basket target count, verified item count, failed/replaced/cancelled item count, aggregate donation/payout amount, aggregate adjusted units, and suppressed participant-level details
- standing microfund pool outcomes only as aggregate allocations/charges/releases by policy-safe buckets; do not reveal a funder's recurring budget, allocation rules, or private moral priorities without explicit consent
- participant-selected donation recipient reporting only at safe aggregate or public-recipient level; do not expose private participant rationale, rejected recipient choices, or related-party review details
- donor-of-record and receipt treatment for donation-consideration lots, stated in plain language without implying tax deductibility or legal charitable-receipt status that the platform cannot support
- sponsor last-dollar gap-fill amount used, threshold met, and released/expired sponsor commitment, reported as funding source rather than separate impact
- participant-proposed-lot conversion counts only in aggregate/suppressed form; do not publish rejected proposal text or threat/safety rationales

Do not expose private participant evidence or private notes. Public reports should phrase results as adjusted units under a protocol, not as guaranteed real-world impact. Suppress or coarsen small cells and subgroup statistics when publishing counts, control-group comparisons, failures, disputes, or other aggregates could identify a participant or reveal sensitive behavior. Sponsor matches and ordinary funder charges must not be reported as separate impact; the same adjusted units should be counted once, with funding sources shown separately.
All public report text, public methodology summaries, public cancellation/incident messages, and public activation explanations must pass the frozen content-sanitization policy before rendering. Team-threshold reports should distinguish “teams started,” “teams activated,” “teams expired,” and “activated commitments selected” without exposing invite graphs or team-member identities.
For pledge-swap lots and baskets, public reports must avoid implying that a fixed $50 donation purchased exactly $50-worth of impact. Report the trade consideration, verified action units, adjusted units, and net-impact caveats as distinct rows or sections. Single-participant lot reports should remain aggregate or pseudonymous unless the participant separately opted into identified publication after settlement.

12. UI pages
Implement polished non-MVP flows:

Cross-flow UX:
- User-facing flows must use the simplified labels and terminology from the UX/language simplification layer. Internal architecture terms such as purchase envelope, consideration obligation, raw-unit key, policy bundle, HMAC, settlement plan, and projection must not appear in ordinary public, funder, participant, or sponsor screens unless explicitly inside an advanced/developer/audit view.
- Public and dashboard pages should be role-based and intent-based: fund verified actions, apply to participate, set a small recurring budget, track my commitments, view results, or suggest a private proposal. Do not make ordinary users choose between internal object types before they understand the action.
- Every page should show a single server-computed next action where feasible. If no action is required, say so plainly.
- Every public card should use a compact summary first: action, consideration/payment, verification level, deadline/status, and expected impact range or fixed pledge-swap terms. Put methodology, limitations, fees, tax/donation treatment, and snapshot details behind clearly labeled expandable sections.
- Status labels shown to users must come from the canonical user-facing state groups and must distinguish authorized/charged/released, eligible/selected/active/verified, funded/accepted/owed, and paused/blocked/cancelled.
- Commitment cards should follow the standard five-part order: what the user agrees to, when money/action starts, what can still fail or change, deadlines/rights, and where receipts will appear.
- Use progressive disclosure: default user-facing screens should show a simple commitment summary, next required action, amount at risk/owed, and deadline; detailed methodology, ledger, snapshot, and audit data should be available behind expandable sections or receipts rather than crowding the primary flow.
- Use stable plain-language state labels across rounds, lots, baskets, and microfund pools: “not started,” “pending funding,” “funded, awaiting participant acceptance,” “accepted, not active yet,” “active,” “verification due,” “under review,” “earned, settlement pending,” “paid/donated,” “released,” “expired,” and “cancelled.” Internal lifecycle codes may be shown only in admin/debug contexts.
- Start public and authenticated flows with an intent picker rather than a raw mechanism menu: “I want to fund impact,” “I want to make a small recurring contribution,” “I want to participate in an action,” “I was invited to a team/cohort,” and “I want to submit a private proposal.” The intent picker may route to rounds, lots, baskets, or microfund pools, but it should explain the commitment model before asking for payment, baseline data, evidence, or proposal text.
- Add an obligation preview panel to every money or action flow showing: what can be charged/released, what can become owed, what cannot happen, key deadlines, whether the commitment is fixed-consideration or per-unit, whether participant identity is public/private, and the exact event that turns an authorization into a charge, donation, or payout.
- Add risk-based comprehension confirmations for complex or high-stakes flows. For example, before a participant accepts a public identified lot, before a funder enables a standing microfund pool, before a user uses stored-balance functionality, or before a donation-consideration participant chooses a charity, ask a short plain-language confirmation that tests the specific obligation and limitation at issue rather than displaying another long terms page.
- Every pledge, enrollment, team-join, evidence-submission, withdrawal, and payout-destination flow should include a plain-language commitment summary card before final submission. The card should state activation mode, whether the user is pending/activated/selected, amount authorized or expected payout, gross/net payout or fees if relevant, key deadlines, evidence obligations, withdrawal/cancellation rights, and what happens if activation or launch fails.
- Every user dashboard should include a “what happens next” stepper generated from server-side state, not client guesses: pending team, activated awaiting selection, selected, active, verifying, dispute window, settling, payout, released/expired/cancelled.
- Countdown timers and progress bars are UX hints only. Server UTC deadlines and server-computed state labels are authoritative, and UI must recover cleanly from stale tabs, offline retries, changed status, expired invites, and exceeded caps.
- Team-threshold UI must avoid coercive social mechanics. It should provide share/revoke/report-abuse controls, neutral copy, aggregate counts only, and clear language that invitees may decline without penalty.
- Round progress UI must label financial states precisely: authorized, reserved, captured/charged, released, matched, paid, held, expired, and unclaimed are distinct states. Do not present authorized pledges or pending team commitments as money already available for payouts.
- User-facing adverse-decision screens must show when the decision became visible, the dispute/appeal deadline, whether a notification failed or was retried, and a support path if the user believes the deadline is wrong.
- Receipts and statements should be easy to find from dashboards and support flows, with stable public receipt identifiers and redacted hashes that support verification without exposing sensitive internals.
- Copy should describe the mechanism as “funding verified actions” or “funding pledge-swap consideration,” not “buying a person,” “paying people not to harm,” or “owning impact.” For pledge-swap lots, cards should state: what action is requested, what consideration is reserved, when money moves, what happens if the participant declines or withdraws, and what evidence is required.
- Copy must not imply that funding a verified action offsets the funder's own behavior, licenses future harm, or substitutes for ordinary moral obligations unless the envelope is explicitly an approved offset product. If users ask for offset framing, route them to the frozen methodology/limitations copy rather than changing public language ad hoc.
- Public progress displays for single-participant lots should avoid real-time “participant accepted,” “evidence submitted,” or “verification failed” signals where those states could identify or pressure a participant. Use coarsened state labels, delayed updates, or aggregate basket-level reporting under the frozen public-progress policy.
- Every funding flow should show a fee/efficiency disclosure before commitment: maximum external charge, expected amount reaching participant/donation consideration, provider/platform fees if charged to the user, whether the contribution will be batched, and what happens if the fee-ratio policy blocks the allocation.
- Every public round, lot, or basket page should include a short “Why this mechanism?” explanation comparing direct pledge, standing microfund, basket, sponsor gap-fill, and ordinary adjusted-impact round where relevant, plus a link to the full methodology for advanced users.
- Standing microfund allocation previews should explain why each allocation was proposed, which user constraints it matched, expected impact range, fee treatment, review mode, cancellation window, and whether the allocation is still reversible.

Public:
- The top-level public UX should be organized around user intent rather than mechanism internals. Use four plain-language entry points: “Fund verified actions,” “Set a small recurring budget,” “Apply to participate,” and “Submit a private proposal.” Advanced labels such as PurchaseEnvelopeRegistry, FundingSourceCommitment, or ConsiderationObligation must not appear outside admin/developer contexts.
- /group-buying
  - list funding, enrolling, active, verifying, and settled rounds
  - filters by category/status and validity mode: instant-valid or team-threshold
  - clear tabs or cards for “Fund a round,” “Fund a small pledge-swap,” “Create a microfund pool,” and “Participate,” with short explanations of how each differs
- /group-buying/[slug]
  - round overview
  - impact-unit explanation
  - funding/enrollment progress
  - pledge CTA
  - participant application CTA if open
  - public report if settled

- /group-buying/[slug]/lots/[lotSlug]
  - crowdfunded pledge-swap lot overview
  - action obligation summary, e.g. “one verified adult participant avoids meat/fish for 2 days”
  - consideration summary, e.g. “$50 donation to an admin-approved effective charity if verified”
  - micro-funding progress using server-computed funding state, not cached counters
  - contribute-small-amount CTA, participant acceptance CTA if invited/open, and settled donation/verification report if complete
  - default pseudonymous participant display for single-participant lots, with identified story/publicity shown only after separate participant opt-in and review
  - clear “what happens if this does not fund / participant declines / participant withdraws / verification is partial / donation fails” disclosure
- /group-buying/[slug]/baskets/[basketSlug]
  - crowdfunded pledge-swap basket overview
  - basket target, e.g. “fund five $50 / 2-day no-meat pledge swaps”
  - aggregate funding progress, sponsor gap-fill status, and basket item status counts
  - micro-contribution CTA and public report after settlement
- /group-buying/microfund-pools
  - authenticated funder page to create and manage standing microfund pools
  - period budget, per-lot/per-basket caps, cause-area/template constraints, allocation history, pause/cancel controls, and receipts

Funder:
- pledge modal/form, including pledge tranche, threshold evaluation stage, authorization-expiry disclosure, optional/policy-bounded funder counterfactual disclosure, platform/provider fee disclosure, and frozen funder terms acknowledgement
- team-threshold pledge flow, if enabled: start a team, join an existing team by non-enumerable invite, see pending/activated/expired status, qualified co-funder count, activation deadline, whether activation grants eligibility or reserves capacity, release behavior, invite revocation/report-abuse controls, and non-sensitive explanation of what happens if the team does not activate
- pledge confirmation page
- dashboard of user’s pledges, charges/releases, authorization status, notification history, and any required reauthorization
- downloadable or printable pledge/settlement receipt showing accepted terms hash, authorization status, charges, releases, fees, and settlement line items
- aggregate-only round progress and impact reporting; no individual participant selection, messaging, or identification unless explicitly permitted by the frozen participant/funder interaction policy

- crowdfunded pledge-swap micro-contribution flow: choose a small amount such as $0.50 where provider policy permits, see whether the lot is pending/fully funded/accepted/active/verified/settled, see whether the contribution was charged or released, and receive a receipt showing the frozen pledge-swap terms, donation/payout outcome, fees, and settlement line item
- crowdfunded pledge-swap basket contribution flow: choose a small amount or allocate from a standing pool to a basket, see aggregate basket progress and sponsor gap-fill status, and receive receipts for basket allocations, charges, releases, and settled donation/payout outcomes
- standing microfund pool setup flow: configure a recurring or one-time budget such as $5/month, per-lot/per-basket caps such as $0.50, eligible cause areas/templates/consideration types, approved-recipient constraints, allocation strategy, payment funding source, pause/cancel behavior, and receipt preferences
- standing microfund allocation review flow: choose auto-lock, preview-then-lock, or manual approval; preview proposed allocations before they lock; cancel or pause future allocations; and see exactly whether each allocation is proposed, locked, authorized, charged, released, or settled
- standing microfund explainability view: show why each proposed allocation matched the funder’s constraints, which rules were binding, which eligible opportunities were skipped, and how much budget remains in the current period
- donation-recipient-scope consent: before funding participant-choice lots/baskets, show the approved recipient list or cause-area scope the funder is consenting to, plus what happens if the participant chooses a recipient outside the funder’s constraints
- lot-funding progress must not reveal the participant's private baseline, identity, evidence, payout details, or private charity-selection rationale. If the lot is for one participant, funders see only the public action obligation and aggregate lot state unless a reviewed policy permits narrower disclosure.

Participant:
- application wizard
- baseline questionnaire
- transparent selected-paid vs waitlist/control explanation and optional follow-up consent
- health/safety withdrawal notice and frozen participant terms acknowledgement, including whether aggregate additionality updates can affect individual payout
- eligibility result
- selected/waitlist status
- team-threshold enrollment status, if enabled: start/join cohort by non-enumerable invite, pending/activated/expired/selected status, qualified co-participant count, activation deadline, whether activation grants eligibility or reserves a slot, clear notice that no action is required until activation, and clear notice that activation is not final selection unless the frozen policy says capacity is reserved
- verification submission dashboard with frozen evidence deadlines, grace-period rules, and reminder status
- payout status, verified payout-destination status, gross/net payout and withholding/fee breakdown where legally appropriate, failed/unclaimed payout retry or hold status, and a plain-language notice that payouts may have tax, benefits, or reporting implications and are not legal/tax advice
- downloadable or printable participant statement showing accepted terms hash, selected/activation status, verification decisions, payout line items, fees/withholding, net payout, and dispute/appeal deadlines
- non-sensitive explanations and dispute/appeal entry points for rejection, non-selection, verification denial, payout holds, failed/unclaimed payout handling, or risk blocks
- notification history for selection, launch, deadline reminders, verification decisions, disputes, settlement, and payout
- participant privacy/publicity controls for single-person lots: show whether the participant is anonymous, pseudonymous, or identified; default to private/pseudonymous; allow identified publication only through a separate post-settlement opt-in that is not bundled with payment or action acceptance

- crowdfunded pledge-swap acceptance flow: invited or eligible participants see the fixed action obligation, fixed charitable donation/payout/mixed consideration, funding status, reserve/guarantee status, verification rules, health/safety withdrawal rights, and a clear warning not to begin until the lot is funded, accepted, and active
- donation-recipient value confirmation: for donation-consideration lots, require the participant to affirm that the selected recipient or fallback recipient is acceptable consideration for them before the action obligation begins; make it clear that they may decline without penalty before acceptance
- donation-consideration participant statement: if verified, show the charity donation owed/executed, donation receipt status where available, any failed/held donation retry status, and dispute/support options without exposing individual micro-funder identities
- donation-recipient choice flow: where enabled, select from a vetted approved charity list before accepting the lot/basket item, see the frozen fallback policy, and receive a receipt showing the selected recipient snapshot hash
- private participant proposal intake: submit “I would be willing to do X if Y is funded” proposals into a private review queue, see private status/rejection/conversion reasons, and understand that no obligation exists until a reviewed lot/basket is created and accepted

Verifier:
- queue of pending verification decisions
- evidence summary
- decision form
- dispute flagging

Admin:
- action template manager, including behavior-change equivalence groups, repeat-participation cooldowns, and fee/withholding policy review
- emergency pause/kill-switch controls with public-message preview, scoped pause types, unpause workflow, and audit history
- template/round safety review workflow
- conflict-of-interest review controls
- round builder
- eligibility review
- fraud/risk review queue for identity, Sybil, baseline, evidence, payment, AML, related-party, participant-welfare, jurisdiction, and abuse flags
- impact-methodology, participant-welfare, adverse-decision, anti-gaming, participant/funder interaction, production-compliance, and jurisdiction-availability review workflow
- state-machine transition history and repair/escalation tools
- production rollout-cap and risk-tier dashboard showing current caps, cap utilization, approved overrides, and cap-increase review history
- incident-response dashboard for safety, privacy, security, payment, AI-processing, legal/compliance, and participant-welfare incidents, including severity, owner, containment status, linked pauses, user-safe public messages, and postmortem status
- reviewer-quality audit dashboard for blinded review coverage, second-review outcomes, disagreement rates, corrections, and calibration needs
- public/private snapshot preview showing exactly what will be public, what remains private, and which canonical snapshot hash will be frozen
- evidence security scan/quarantine queue
- team-activation dashboard for pending, activated, expired, and cancelled activation groups, invite-token hashing/revocation, invite-abuse review, distinct-qualified-member counts, activation-effect/capacity reservation status, activation-window jobs, and aggregate conversion reporting
- team-counter reconciliation view showing cached counts versus transactionally recomputed qualified members and any activation decisions blocked by stale or inconsistent counters
- crowdfunded pledge-swap lot manager for creating/reviewing lots, approving donation recipients, configuring micro-pledge minimums/provider policies, viewing fully funded vs participant-accepted vs active states, previewing fixed-consideration settlement, and reconciling micro-pledges, donation operations, reserves, and public reports
- crowdfunded pledge-swap basket manager for creating/reviewing baskets, configuring basket item count, replacement policy, sponsor gap-fill policy, standing-pool eligibility, recipient-choice policy, and aggregate reporting
- feature-capability manager showing which group-buying modules are disabled, dev-only, private-beta, limited-public, enabled, or paused by environment/jurisdiction/risk tier
- operational-efficiency review view for isolated lots, showing expected impact, expected verification/payment/support cost, privacy small-cell risk, and reviewer rationale for allowing a single lot instead of requiring a basket or batch round
- standing microfund pool operations view for allocation jobs, budget exhaustion, provider-minimum blocks, wallet/batching reconciliation, user pause/cancel events, and allocation receipt failures
- participant donation-recipient review tools for approved charity lists, selected-recipient snapshots, fallback substitutions before action start, and blocked/related-party recipient attempts
- last-dollar sponsor matching dashboard for threshold triggers, reserve status, sponsor terms, used/released gap-fill funds, and public-reporting treatment
- private participant-proposal review queue with anti-threat flags, safety/methodology/welfare review, conversion-to-lot/basket tooling, and non-sensitive rejection reasons
- user-receipt and deadline-visibility dashboard for receipt generation failures, missing participant-visible timestamps, dispute/appeal deadline extensions, and notification-linked deadline holds
- unclaimed payout / abandoned-balance dashboard for failed payout retries, participant contact attempts, compliance holds, escheatment/remittance review, and liability ledger reconciliation
- clearing preview
- launch approval
- verification oversight
- settlement preview/approval, including participant-payout reserve checks and payment authorization expiry checks
- dispute management
- notification/job status dashboard for reminders, reauthorization requests, settlement events, and payment-provider webhooks, including signature-verification failures, replay detections, and quarantined events
- deadline-job and retention/deletion dashboard for launch expiry, verification deadlines, dispute windows, reauthorization reminders, evidence-retention actions, erasure requests, legal holds, and stale-job recovery
- credited-action-unit / double-count review dashboard for overlapping enrollments, existing pledge-swap agreement conflicts, de-duplication decisions, reversals, and settlement consumption
- ledger/reconciliation dashboard for reserves, authorizations, captures, releases, rollovers, payouts, sponsor matches, and shortfalls
- migration/backfill, backup/restore, and recurring reconciliation dashboard for pledge-swap adapter backfills, credited-action-unit registry migration, ledger/provider reconciliation, backup restore checks, and production-readiness blockers
- observability dashboard or links for failed jobs, stuck settlements, webhook failures, notification failures, unusual evidence access, and risk-review backlogs
- audit log viewer
- public-content sanitization preview for round descriptions, public reports, public messages, and user-generated public summaries
- notification preference/consent dashboard showing which lifecycle notices are optional versus critical transactional notices
- research/data-use consent dashboard for waitlist/control follow-up, cross-round analytics, publication, model-training, and external-sharing uses

13. Seed data / demonstration
Add a seed/demo round:

Title: Sponsored 30-Day Vegetarian Diet-Shift Round
- Impact unit: expected additional avoided meat/fish meal
- Minimum expected adjusted units: 1,500
- Maximum cost per adjusted unit: $2.00
- Unit price: $1.25, stored as integer minor units
- Participant payout cap: $60, stored as integer minor units
- Participant-payout reserve: sufficient to cover the selected participants’ maximum possible payouts under the frozen terms
- Sponsor matching pool: $1,000, 1:1 match, with explicit reserve/bonus eligibility
- Ordinary funder target: 200 × $10 in the round’s single settlement currency
- Example participants with varied baselines and additionality probabilities
- Example settlement showing partial completion and adjusted-unit payout
- Example frozen verification deadline, dispute window, reauthorization deadline, expected settlement/payout timing, and simulated notification schedule
- Example public methodology summary explaining the raw unit, additionality prior, verification-confidence role, protocol-relative moral-impact weight, persistence multiplier, moral-view/cause-area summary, behavior-change equivalence group, no-trade baseline, and limits of funder-side counterfactual information
- Example simulated ledger entries showing reserve funding, funder authorization, sponsor match, participant payable, release, and payout flows
- Example frozen round_snapshot_hash and redacted audit/provider/notification log records
- Example operational pause records and unpause audit history in development mode
- Example DeadlineJob records for launch expiry, verification cutoff, dispute-window close, reauthorization reminders, and evidence-retention deletion
- Example PrivacyErasureRequest and DataRetentionAction records showing redaction, tombstoning, and legal-hold behavior
- Example payment-provider webhook events with verified, duplicate, failed-signature, and replay-detected outcomes
- Example canonical snapshot JSON whose hash matches the public snapshot identifier
- Example public snapshot export and private policy snapshot reference showing that anti-gaming thresholds are not exposed publicly
- Example hash/identifier policy showing snapshot hash algorithm/canonicalization, public-safe identifiers, private evidence hashes, and HMAC-derived raw_unit_key values that do not expose raw participant/action data
- Example CreditedActionUnit records showing de-duplication keys, cross-feature pledge-swap conflict checks, and settlement consumption
- Example DataBackfillJob, ReconciliationRun, and BackupRestoreCheck records showing dry-run pledge-swap adapter backfill, cross-feature credited-action-unit reconciliation, ledger/provider reconciliation, and a passing restore drill in development mode
- Example SelectionDecision rows, frozen eligible applicant set, seed-commitment/reveal audit, participant-welfare review, anti-gaming policy, adverse-decision policy, participant/funder interaction policy, UTC/display-timezone settings, and deterministic decimal precision/rounding policy
- Example AIProcessingLog and MutationIdempotencyRecord entries showing approved-processor use, prompt-injection-safe evidence handling, and duplicate form submission protection
- Example UserReceipt records for pledge authorization, team activation, enrollment, evidence submission, verification decision, settlement, payout attempt, and cancellation/release
- Example failed/unclaimed payout lifecycle showing retry, hold, participant contact, expiry, and unclaimed-property/compliance disposition in simulated mode
- Example ReviewQualityAudit and IncidentReport records showing blinded verification review, second-review sampling, a contained low-severity incident, and postmortem/audit linkage
- Example TermsAcceptance records for funder, participant, sponsor, and admin approvals, plus an idempotency-key mismatch example that fails safely
- Example ParticipantPayout records with verified payout-destination snapshots, retry/hold/expiry fields, and unclaimed-payout policy behavior
- Example fee/withholding policy with zero platform fees in development mode plus gross/net payout fields that reconcile exactly
- Example rollout cap/risk-tier configuration and accessible user-facing copy for deadlines, payout terms, withdrawal, and dispute/appeal notices
- Example plain-language commitment summary cards and server-state steppers for funder pledge, participant enrollment, team join, evidence submission, withdrawal, and payout status
- Example public-content sanitization policy, notification preference records, and research/data-use consent records for waitlist/control follow-up
- Example instant-valid configuration where a single funder pledge is valid immediately subject to round-level launch/reserve rules
- Example team-threshold configuration where a funder starts a 3-person pledge team with a 24-hour activation window; failure releases pending authorizations, while success converts all pending pledges to activated status
- Example participant cohort activation where five participants must join within a frozen window before any participant is selected or asked to begin the challenge; after activation, individual payouts depend only on each participant’s verified adjusted units
- Example TeamActivationGroup and TeamActivationMember records showing pending, activated, expired, and cancelled states without exposing participant identities publicly
- Example stale TeamActivationGroup cached counts that are corrected by recomputation before activation, demonstrating that cached counters are not authoritative
- Example TeamActivationInvite records showing hashed invite tokens, revocation, expiry, use limits, abuse reports, and no raw token storage in logs/admin lists
- Example activation-effect policies showing eligibility-only activation, capacity-reserved activation, and activate-and-select-if-clear behavior with distinct user-facing state labels
- Seeded payment configuration should default to simulated/development mode and visibly label all money movement as simulated unless real provider credentials and production feature flags are configured

Add a second seed/demo lot:

Title: Crowdfunded $50 / 2-Day No-Meat Pledge-Swap Lot
- Lot type: single_participant_pledge_swap
- Consideration type: charitable_donation
- Action obligation: one selected adult participant avoids meat/fish for 2 days after the lot is fully funded, accepted, and active
- Donation consideration: $50 to an admin-approved effective charity chosen from the frozen approved-recipient list
- Micro-funding target: 100 × $0.50 contributions in USD where simulated provider policy permits sub-dollar micro-pledges
- Micro-pledge minimum: $0.50 in development/simulated mode; production minimum must follow the configured provider-minimum/batching policy
- Funding deadline, participant acceptance deadline, 2-day action window, verification deadline, dispute deadline, expected donation execution, and expected public report timing
- Example micro-pledges showing authorized, activated, captured, released, expired, and failed states
- Example fully funded path where the participant accepts, completes both days, verification succeeds, funders are charged pro rata or exactly according to their micro-pledges, and a $50 simulated charitable donation operation is executed
- Example failed funding path where only $37.50 is authorized by the deadline, all micro-pledges are released, the participant is not asked to begin, and the public explanation is non-sensitive
- Example participant withdrawal path before action begins, releasing or rolling forward micro-pledges only under explicit funder consent
- Example donation failure path where the donation remains a ledger-visible obligation and is retried or routed to compliance/support under the frozen donation failure policy
- Example public lot report that shows aggregate micro-funder count, total charged, total released, verified action obligation, donation recipient public name, and donation receipt status without exposing individual funders or private participant data

Add a third seed/demo basket:

Title: Crowdfunded Basket of Five $50 / 2-Day No-Meat Pledge Swaps
- Basket type: homogeneous_lots
- Target: five verified pledge-swap items
- Consideration: $50 charitable donation per verified participant, $250 total target
- Micro-funding example: 500 × $0.50 simulated allocations, including direct micro-pledges and standing microfund pool allocations
- Participant donation-recipient choice: each selected participant chooses one charity from three approved effective-charity recipients before accepting the 2-day no-meat obligation
- Sponsor gap-fill: sponsor fills the last 20% if the basket reaches at least 80% of target by the funding deadline
- Replacement policy: if a participant withdraws before action begins, invite a waitlisted eligible participant under the frozen replacement policy; after action begins, do not replace for that item unless the frozen terms explicitly allow it
- Example settlement: four verified completions, one pre-action replacement, $250 total simulated donation operations, aggregate adjusted units reported once, and no individual participant/funder identities public

Add a standing microfund pool seed:
- Funder A configures “Allocate up to $5/month to verified animal-welfare pledge swaps, maximum $0.50 per lot or basket item, approved charities only, release unused budget at month end.”
- Example allocations into the single $50 lot and the five-lot basket, including allocation receipts, budget exhaustion, pause/cancel behavior, and provider-minimum/batching policy in simulated mode.

Add a participant-proposed-lot seed:
- Participant privately submits “I would be willing to complete a 2-day no-meat challenge if $50 is donated to one of these approved global health charities.”
- Admin converts it into a standardized reviewed crowdfunded pledge-swap lot.
- A second threat-framed proposal is rejected with a non-sensitive participant-visible reason and private anti-threat rationale.

Add an architecture/capability seed:
- Example MoralGoodsFeatureCapability records showing crowdfunded lots enabled in development, standing microfund pools private-beta only, internal wallet support disabled in production, charitable-donation execution dev-simulated, and production real-money movement disabled until compliance/reconciliation gates pass.
- Example ConsiderationObligation records for a $50 charitable donation, a participant payout, a sponsor gap-fill obligation, a provider-fee obligation, and a release/refund obligation, all reconciling to settlement and ledger rows.
- Example single-lot operational-efficiency review approving the $50 / 2-day no-meat demo lot as a pedagogical pilot while marking baskets as the preferred production path.
- Example donor-of-record policy showing that simulated donations produce platform-visible donation receipts only and do not promise tax-deductible receipts to micro-funders.
- Example standing microfund pool in preview-then-lock mode, including a proposed allocation notice, notice-window expiry, lock, charge/release, and user cancellation before a later allocation.

14. Tests
Add unit/integration tests for:
- one-screen deal cards render action, consideration, user role, status, next step, failure behavior, and details link for rounds, lots, baskets, and standing-budget allocations
- Level 1/Level 2/Level 3 progressive disclosure keeps formulas and internal architecture terms out of ordinary pledge/application cards while preserving accessible methodology and audit details
- formula presentation rule shows plain-language impact explanation before the full adjusted-impact formula in ordinary user flows
- canonical status sentence templates match server-side state and do not drift from purchase-envelope registry, action-commitment, funding-source, consideration-obligation, settlement, and receipt records
- simplified Fund/Participate/Results navigation and dashboard groupings show the correct next action for funders, participants, sponsors, and support users
- standing microfund guided preset flow enforces safe defaults and exposes advanced constraints without hiding them before commitment
- participant proposal intake collects ordinary-language fields first, keeps proposals private until review, and shows the non-obligation explanation
- copy-lint tests reject internal architecture terms, ambiguous money verbs, unsupported “guaranteed/confirmed/impact” claims, double-negative status copy, and icon/color-only obligations in ordinary UI
- reusable failure/edge-case message templates exist for failed funding, expiry, withdrawal, verification failure, reauthorization, donation fallback/failure, payout hold, pause, settlement delay, and public-report suppression
- expected adjusted unit calculation
- SettlementPlan hashes bind funding sources, credited action units, consideration obligations, fees, donation/payout/release operations, and ledger entries; execution fails if any approved-plan input changes
- feature-capability dependency graph blocks modules whose prerequisites are disabled, unsupported, or paused
- micro-pledge fee-ratio guardrails batch, route, block, or require renewed consent when provider/platform fees exceed frozen user or envelope limits
- PurchaseEnvelopeForecast and MechanismCalibrationRun records compare expected versus actual funding, completion, adjusted units, fees, and verification burden without retroactively changing frozen obligations
- clearing fails below threshold
- clearing succeeds when expected units and budget are sufficient
- participant payout does not depend on group completion
- funder constraints respected
- sponsor matching applied correctly
- pro rata funder charging
- unused authorization release/rollover
- waitlist/control randomization
- additionality update from control group
- anti-threat flagging
- authoritative policy-bundle and denormalized snapshot drift fails closed before activation, settlement, and public reporting
- DomainEventOutbox dispatch is idempotent and retries do not duplicate notifications, receipts, public-progress updates, provider calls, or projection writes
- overfunding, oversubscription, and standing-microfund allocation use the frozen allocation/rationing policy and do not route funds outside user constraints
- public-progress suppression coarsens or delays single-participant lot states without blocking the user's own receipts and financial dashboard
- offset/moral-licensing copy controls prevent non-offset envelopes from being presented as offsets or permission to perform harmful behavior
- risk-based UserComprehensionCheck records are required for configured high-risk, stored-balance, participant-identified, or donation-tax-receipt flows
- role access controls
- settlement public report excludes private evidence
- audit events created for sensitive changes
- immutable round snapshot prevents later template edits from changing settlement
- idempotent settlement retry does not duplicate charges, releases, or payouts
- monetary calculations use integer minor units and deterministic rounding
- private evidence access creates EvidenceAccessLog entries
- minor/adult-gating and health/safety withdrawal paths
- template/round safety review blocks unsafe publication
- per-pledge FunderSettlementLineItem records match aggregate settlement totals
- participant payout formula-input fields reproduce adjusted_units_final
- concurrent launch/clearing/settlement attempts cannot double-select, double-settle, or move money twice
- public report small-cell suppression/coarsening
- funder and participant terms acknowledgements use the frozen round snapshots
- single-currency enforcement or explicit FX snapshot behavior
- payment authorization expiry and reauthorization before launch/settlement
- participant-payout reserve solvency blocks launch/settlement when insufficient
- settlement-stage funder thresholds cannot reduce guaranteed participant payouts
- no duplicate credit/payment for overlapping raw action units across rounds
- transparent waitlist/control consent and no unpaid-action instruction for controls
- sponsor settlement line items match aggregate sponsor-match totals
- sponsor matching does not double-count adjusted impact units in public reports
- conflict-of-interest checks block conflicted verification, dispute, safety-review, and settlement approvals
- open disputes/fraud/payment-compliance holds block or isolate affected settlement line items
- production real-money feature gate prevents simulated provider use for public production money movement
- payment-provider webhook events are idempotent and duplicate events do not duplicate balance changes
- identity/Sybil/fraud-risk reviews block paid selection or payout when required
- frozen verification deadlines, grace periods, dispute windows, reauthorization deadlines, and expected payout timing are enforced
- lifecycle notifications are created without leaking private evidence, baseline details, payment references, or fraud/safety notes
- validly owed participant payouts are not clawed back or reduced because of funder-side capture failure, reversal, or chargeback; frozen shortfall policy is used instead
- ledger entries balance per transaction and reconcile to settlement totals, line items, payment operations, and provider events
- participant-payout reserve ledger funds cannot be spent on conditional bonus/impact-purchase obligations
- evidence uploads enforce size/type limits, scan or quarantine suspicious files, strip configured metadata, and avoid unsafe inline rendering
- jurisdiction/availability checks block unsupported real-money funding, enrollment, sponsor matching, and payouts
- methodology review is required before public round publication and later methodology edits do not alter frozen settlement calculations
- server-side authorization and recalculation reject tampered client-submitted eligibility, additionality, verification, pricing, status, payment, and evidence-access fields
- AuditEvent, NotificationLog, PaymentProviderEvent, and observability records redact sensitive values while preserving hashes/references needed for audit and debugging
- frozen round_snapshot_hash is created before launch, remains stable through settlement, and is included in settlement calculation hashes
- rollover or donation refund preferences require explicit consent and unsupported successor-round uses release funds instead
- lifecycle state-machine rejects invalid direct status transitions and emits audit events for valid transitions
- UTC deadline enforcement works independently of user display timezone/localization
- deterministic decimal arithmetic avoids binary floating-point drift in adjusted-unit and payout calculations
- SelectionDecision records explain selected, waitlisted/control, not-selected, and rejected applicant outcomes
- participant-welfare review blocks or escalates exploitative compensation, protected-attribute/proxy use, or predatory targeting
- related-party, self-dealing, AML, and circular-funding risk reviews block launch/settlement when required
- CSRF/session protection, rate limits, and abuse throttles protect public forms, mutation endpoints, evidence uploads, and admin actions where supported
- LedgerTransaction rows group balanced LedgerEntry rows and reconcile to settlement/payment operations
- private dispute claims/resolutions remain private while participant-visible/public summaries are sanitized
- anti-gaming policy redacts exact baseline thresholds, scoring weights, and risk heuristics from public/funder/participant views while preserving frozen private policy for audit
- funders and sponsors cannot identify, select, message, or target individual participants outside approved aggregate flows
- material adverse decisions create participant/funder-visible non-sensitive reasons and dispute/appeal paths or use a frozen low-risk automation policy
- canonical snapshot serialization produces stable hashes independent of JSON key order and settlement hashes reference the canonical snapshot hash
- temporal-order validation rejects impossible deadlines/action windows before publication and launch
- append-only audit, review, ledger, and state-transition records cannot be mutated through normal services; corrections use reversal/superseding records
- CreditedActionUnit records prevent duplicate settlement consumption of the same participant/action/window, including concurrent settlement retries
- sensitive payment, payout, KYC/tax, baseline, and private evidence references are tokenized/encrypted/protected and raw instruments/IDs are not stored in group-buying tables
- production-compliance review blocks real-money rounds that lack required labor/tax/fundraising/payment-provider/legal review
- payment-provider webhook signature verification, timestamp tolerance, and replay protection block unverified or replayed provider events from mutating balances or payment state
- out-of-order or stale payment-provider events cannot regress PaymentOperation, LedgerTransaction, payout, settlement, or user-visible payment state
- emergency pause/kill-switch blocks configured publication, intake, money movement, evidence upload, notification, clearing, or settlement paths while preserving permitted safe withdrawal, support, dispute, and required release/refund flows
- high-risk admin actions require step-up authentication or recent re-authentication where supported, and step-up events are audited without logging secrets
- deadline jobs are idempotent, lock correctly, and do not duplicate notifications, status transitions, releases, settlement actions, or retention/deletion actions on retry
- retention/deletion jobs redact, delete, tombstone, or crypto-erase sensitive payloads after retention expiry while preserving non-sensitive audit hashes and respecting legal/compliance holds
- public API serializers and pages expose only public snapshot/export fields and never leak private anti-gaming, fraud/risk, security, or protected-threshold policy snapshots
- cross-feature double-counting with existing pledge-swap / moral-trade compensated commitments blocks duplicate credited action units and duplicate payouts
- pledge-swap / moral-trade action-unit backfill jobs are idempotent, produce dry-run counts, and fail closed on unresolved reconciliation errors before cross-feature de-duplication is enforced
- periodic reconciliation detects mismatches among settlements, ledger entries, payment-provider events, payout reserves, and credited-action-unit consumption, and blocks production operations when required by policy
- backup/restore checks verify that settlement, ledger, provider-event, credited-action-unit, and audit metadata can be restored and reconciled without restoring erased private payloads contrary to retention policy
- randomized oversubscription freezes the eligible applicant set and seed commitment before selection; rerandomization or override requires an audited reason
- evidence-upload and review workflows prompt for or support redaction of unrelated third-party personal data in receipts, photos, and metadata
- provider credentials, webhook secrets, and encryption/signing keys are never exposed to client bundles, snapshots, logs, seed data, or ordinary database rows
- payout-destination changes after settlement approval require re-verification/risk review, and failed or unclaimed payouts follow the frozen retry/hold/expiry policy without silent cancellation or redirection
- platform fees, provider fees, tax withholding, gross payout, net payout, and rounding deltas are disclosed where appropriate and reconcile across ParticipantPayout, Settlement, LedgerEntry, and PaymentOperation records
- participant-payout reserve funds cannot be used for platform or provider fees unless the frozen terms explicitly allocate that cost without reducing gross participant payout obligations
- behavior-change equivalence groups prevent evasion of repeat caps, cooldowns, additionality penalties, and anti-threat controls through near-equivalent templates
- AI-assisted review or summarization uses only approved processors, redacts inputs according to policy, treats evidence/user text as untrusted, and never produces final material adverse decisions outside the frozen automation/adverse-decision policy
- mutation idempotency prevents duplicate pledges, enrollments, evidence uploads, disputes, appeals, payout-destination submissions, and high-risk admin approvals on client retry or double submit
- mutation idempotency rejects reuse of the same idempotency key with a different actor, scope, operation type, or request_hash
- TermsAcceptance records reference the frozen terms/snapshot hashes and are required before pledge authorization, enrollment, sponsor-pool activation, payout-destination use, launch approval, or settlement approval
- TermsAcceptance revocation or replacement preserves original proof of consent and cannot retroactively void validly incurred obligations
- evidence original/sanitized/redacted hashes and provenance records are created and preserved without exposing raw private evidence publicly
- hash, HMAC, raw_unit_key, request_hash, and snapshot-hash records store algorithm/canonicalization or derivation-policy version metadata
- raw_unit_key values are generated server-side, do not contain raw participant identifiers or sensitive action-window data, and cannot be reconstructed from public round data
- public APIs, public reports, dashboards, logs, and analytics do not expose private evidence hashes, HMACs, raw_unit_key values, sensitive request hashes, or protected-reference hashes
- methodology review and settlement/public reporting account for material substitution effects, rebound effects, or negative externalities under the frozen action-template methodology
- methodology review and public reporting label moral-impact weights as protocol-relative to the frozen moral-view/cause-area summary and do not present them as platform-endorsed universal moral truth
- public reports distinguish verified adjusted units purchased from net social impact, use only aggregate/suppressed funder-counterfactual information, and do not let funder-counterfactual fields affect participant payouts or owed charges under frozen terms
- reviewer blinding/minimization is applied where feasible, ReviewQualityAudit records are created for high-risk or sampled decisions, and disagreement/correction paths preserve private data controls
- IncidentReport workflows record severity, owner, containment action, linked pauses/disputes/provider events, public messaging where appropriate, and postmortem status; unresolved high-severity incidents block affected production operations under policy
- rollout caps and risk-tier limits block launch, funding, enrollment, or settlement when exceeded unless an approved override exists
- instant-valid rounds allow a single eligible pledge or enrollment to become valid without a team activation group, subject to ordinary round-level checks
- team-threshold activation groups activate only when the required co-funder/co-participant thresholds are met within the frozen activation window
- pending team-threshold pledges/enrollments are excluded from launch solvency, participant-payout reserve, expected adjusted units, clearing, settlement, and public activated progress
- expired team-threshold activation groups release pending authorizations, mark pending enrollments expired/not selected, and do not ask participants to perform the action
- team activation expiration and activation-window reminders are idempotent and safe on retry
- activated selected participants do not lose validly owed post-action payout because later co-funders or co-participants fail, withdraw, or expire
- team invitation and activation flows apply Sybil, invite-abuse, privacy, and aggregate-only visibility controls
- funder and participant status timelines and receipt/statement views are derived server-side and reconcile to terms, settlement, ledger, payment, and payout records
- team invite tokens are non-enumerable, stored hashed/protected, rate-limited, revocable, and absent from logs, analytics, public pages, and ordinary admin tables
- team-threshold counts use qualified distinct natural persons or approved organizations, not duplicate accounts, related-party clusters, duplicate payout destinations, or reused payment instruments
- team_activation_effect semantics are enforced: eligibility-only activation is not displayed as selected/confirmed, capacity-reserved activation holds/reconciles reservations, and activate-and-select-if-clear is atomic with capacity/reserve/compliance checks
- commitment summary cards and server-state steppers render correct activation, selection, deadline, fee, payout, withdrawal, and failure states for stale-tab, retry, expired-invite, and exceeded-cap scenarios
- public-content sanitization strips or blocks unsafe HTML, scripts, embedded media, tracking pixels, unsafe links, and unsupported markdown from public round/report/user text
- team activation uses transactionally recomputed qualified-member counts; stale or tampered cached counts cannot activate, expire, reserve capacity, or appear as authoritative public progress
- team activation windows cannot extend beyond enrollment/launch deadlines or require action before activation/selection; invalid timing fails publication or launch
- team-threshold UI contains no public leaderboards, shame lists, member rankings, or coercive invite-pressure copy, and invite/report/block controls are present where enabled
- adverse-decision dispute/appeal windows are computed from participant/funder-visible decision timestamps, and notification or receipt-generation failures hold, extend, or route deadlines to support under the frozen policy
- UserReceipt records are generated for material commitments and outcomes, reference the correct frozen snapshot hashes, and do not expose private policy snapshots, other users’ data, or sensitive internal hashes
- unclaimed payout and abandoned-balance handling preserves ledger-visible liabilities, follows frozen retry/hold/expiry/escheatment policy, and cannot silently convert funds to platform revenue
- off-platform side payment, private contact, or compensation-circumvention reports trigger risk review, dispute, incident, or support workflows under the frozen policy
- notification preferences suppress optional notices but preserve critical transactional/safety/legal/deadline/payout notices under the frozen policy
- research/data-use consent blocks non-administrative use of waitlist/control/follow-up data unless the frozen consent or approved basis exists

- ResearchDataUseReview records are required and approved before waitlist/control/follow-up data can be used for public research, external evaluation, model training, or cross-round behavioral analysis beyond precommitted aggregate additionality estimation
- accessibility checks or documented manual tests cover core pledge, application, evidence, withdrawal, adverse-decision, and payout-status flows
- observability/alert records are created for stuck settlements, failed webhooks, failed notifications, failed payment operations, and unusual private-evidence access
- property-based or deterministic invariant tests cover settlement, ledger, payment-state-machine, lifecycle-state-machine, credited-action-unit, idempotency, and public/private-snapshot boundaries where supported
- purchase-envelope registry rows reconcile to envelope-specific tables and cannot drive contradictory public listings, deadline jobs, or settlement routing
- ParticipantActionCommitment records are created before participant action begins and are the source of truth for verification, credited action units, receipts, and settlement consumption across rounds, lots, baskets, and pledge-swap adapters
- frozen policy bundles reject missing, incompatible, non-canonical, or hash-mismatched components before publication, activation, settlement, and public reporting
- fixed-consideration pledge-swap settlement reports donation/payout consideration separately from adjusted impact units and optional net-impact estimates
- single-participant lot identity, story, charity choice, and baseline summary remain private/pseudonymous unless a separate post-settlement opt-in publicity record exists
- standing microfund explainability views correctly explain matched, skipped, proposed, locked, charged, released, and remaining-budget states

- crowdfunded pledge-swap lot reaches fully funded state only when activated/instant-valid micro-pledges meet the frozen target amount, provider-minimum policy, and any minimum distinct-funder rule
- sub-dollar simulated micro-pledges such as $0.50 are stored as integer minor units and either accepted in development or blocked/raised to the configured production minimum under real provider policy
- failed or expired crowdfunded pledge-swap lots release micro-pledge authorizations and do not ask participants to begin the action
- participant acceptance is required before a crowdfunded pledge-swap lot becomes active; fully funded is not displayed as accepted, active, verified, owed, or settled
- verified fixed-consideration pledge-swap lots execute the frozen charitable donation/payout/mixed consideration and do not reduce owed consideration because of later micro-funder failure, chargeback, or post hoc adjusted-unit changes
- donation recipients must be admin-approved and frozen into the lot snapshot before donation-consideration pledge-swap lots can launch or become active
- crowdfunded pledge-swap lot public reports aggregate or suppress micro-funder and participant data and do not reveal private baseline, evidence, payment, risk, or charity-selection details
- cross-feature double-counting blocks a participant from being paid/credited for the same 2-day no-meat action through both a crowdfunded pledge-swap lot and another pledge-swap/group-buying agreement
- crowdfunded pledge-swap baskets clear only when basket target, minimum item count, reserve policy, standing-pool allocation rules, and sponsor gap-fill rules satisfy the frozen snapshot
- basket settlement creates auditable per-item outcomes and aggregate public reports without exposing individual participant or micro-funder identities
- standing microfund pools respect period budgets, per-lot/per-basket caps, eligibility constraints, pause/cancel state, and concurrent allocation idempotency
- standing microfund allocations generate receipts and do not create provider calls below configured production minimums unless wallet/batching policy supports them
- participant donation-recipient choice is limited to approved recipients, frozen before action begins, and used by settlement/donation operations
- unsupported or blocked donation recipients trigger frozen fallback/cancellation before action begins and donation-failure handling after verified completion
- last-dollar sponsor gap-fill triggers only at the frozen threshold, reserves/reconciles funds, and is not counted as separate impact
- participant-proposed lots remain private until converted by admins, and threat-framed proposals are rejected or escalated without public exposure
- shared ConsiderationObligation records are created before money movement and reconcile to funding sources, settlement line items, ledger entries, donation/payout operations, receipts, and public-report aggregates
- feature-capability gates block disabled modules in UI, API, clearing, settlement, jobs, seed data, and public reporting
- donation-recipient choice respects each micro-pledge, standing pool, and sponsor recipient-scope constraint; incompatible funding sources are excluded/released rather than silently redirected
- donor-of-record and tax-receipt disclosures are frozen and do not imply personal charitable deductibility unless the provider/compliance configuration supports it
- standing microfund preview_then_lock and manual_approval_required modes do not lock allocations before the notice window or explicit approval, and concurrent jobs cannot exceed period budgets
- isolated single-lot operational-efficiency review blocks or escalates lots whose expected verification/payment/support overhead exceeds the frozen threshold without reviewer rationale
- progressive-disclosure UI shows simple state labels to ordinary users while preserving detailed snapshot/ledger/audit data in receipts or expandable sections

- PurchaseEnvelopeRegistry rows are created for rounds, lots, baskets, basket items, and imported pledge-swap agreements, and public state groups remain consistent with source-table statuses
- FundingSourceCommitment rows reconcile to ordinary pledges, micro-pledges, standing microfund allocations, sponsor matches, sponsor gap-fill commitments, captures, releases, and ledger entries
- ParticipantActionCommitment rows allow lot and basket verification/settlement without requiring a round-scoped ParticipantEnrollment
- Settlement can execute for a lot or basket with no round_id by using purchase_envelope_type/purchase_envelope_id and generic FundingSettlementLineItem rows
- PaymentOperation records for micro-pledges, standing allocations, sponsor gap-fill, donations, and payouts contain enough envelope/funding/obligation references to reconcile without round-only foreign keys
- public lots and baskets default to anonymous participant supply; named participant disclosure requires explicit opt-in and reviewed policy
- participant pre-acceptance expiry, post-funding invitation decline, and participant replacement policies release or roll forward funding without exposing private decline reasons
- canonical envelope state groups render consistently across round, lot, basket, basket item, and microfund dashboards
- proportional verification-burden checks route low-value/high-burden lots to baskets, redesign, or rejection
- donation-recipient due-diligence freshness blocks obligation lock and donation execution when approval, payment destination, sanctions/AML, or jurisdiction status is expired or blocked
- top-level public UX tests show user-intent entry points and do not expose internal architecture terms to ordinary users

- simplified public/funder/participant/sponsor screens do not expose internal architecture terms such as purchase envelope, consideration obligation, raw_unit_key, HMAC, policy bundle, settlement plan, or projection outside advanced/debug/audit contexts
- role-based entry points route ordinary users to fund, apply, set budget, track commitments, view results, or suggest a private proposal without forcing them to understand internal envelope types
- public cards and dashboards show compact plain-language summaries before advanced methodology, settlement, hash, or policy details
- canonical user-facing state labels correctly distinguish funded, accepted, active, proof due, under review, settling, complete, released/expired/cancelled, and paused/blocked states
- commitment summary cards render the standard five-part order for pledges, micro-pledges, standing budgets, participant applications, charity choices, evidence submissions, withdrawals, payout destinations, and disputes
- funder dashboards distinguish authorized, allocated, charged, released, rolled over, completed, and cancelled money states using plain language
- participant dashboards always show the correct single next instruction, including “do not start yet,” “start now,” “submit proof,” “wait for review,” “dispute by [date],” and payout/donation completion states
- standing microfund allocation receipts provide concise user-visible routing explanations without revealing private participant, risk, or anti-gaming data
- admin/reviewer screens can access full technical detail while defaulting to checklists, blockers, public/private preview diffs, and action-required queues
- comprehension checks appear only for configured risk cases, test the required money/action/privacy/tax/evidence concepts, and do not obstruct withdrawal, cancellation, support, or dispute flows

15. Acceptance criteria
The feature is complete only when:
- ordinary public/funder/participant screens use concrete action-first labels and one-screen deal cards rather than requiring users to understand pledge-swap, envelope, settlement, or policy terminology,
- every ordinary commitment flow has an accessible Level 1 summary, expandable Level 2 details, and no required exposure to Level 3 admin/developer/audit language,
- ordinary pledge/application cards explain adjusted impact in plain language and reserve the full formula for methodology or report details,
- public, dashboard, notification, and receipt text is generated from server-side state presenters and cannot drift from underlying purchase-envelope, funding-source, action-commitment, consideration-obligation, settlement, and receipt records,
- funder, participant, sponsor, and support dashboards group work by user action needed rather than raw lifecycle codes,
- standing microfund setup has a guided preset flow with safe defaults and optional advanced controls available before commitment,
- participant private proposal intake uses ordinary-language first-step fields and clearly states that submission is private and non-obligating until review and acceptance,
- reviewed failure/edge-case templates explain money, action, deadline, and receipt consequences without blaming users or exposing sensitive reasons,
- a user can view a group-buying round,
- enabled feature modules have satisfied capability dependencies and disabled modules fail closed across UI, API, jobs, settlement, and reporting,
- clearing produces a persistent SettlementPlan and settlement execution references the approved plan hash,
- micro-pledges and standing-pool allocations enforce provider/platform fee-ratio constraints through batching, routing, blocking, or renewed consent,
- a funder can authorize a conditional pledge,
- a funder can use instant-valid pledge flow or, where enabled, start/join a team-threshold pledge group with visible pending/activated/expired status,
- a funder can contribute a small micro-pledge to a crowdfunded pledge-swap lot, including a $0.50 simulated contribution where configured, and can see whether it is authorized, activated, charged, released, expired, or settled,
- many micro-funders can jointly fund a fixed pledge-swap consideration such as a $50 donation to an approved effective charity in exchange for one participant completing a frozen 2-day no-meat action,
- many micro-funders can jointly fund a basket of pledge-swap items, such as five $50 donations for five verified 2-day no-meat actions, with per-item and aggregate settlement/reporting,
- a funder can create, pause, cancel, and audit a standing microfund pool such as $5/month with at most $0.50 per lot or basket item, and the platform allocates only within the frozen constraints,
- a funder can choose standing microfund allocation review mode, and proposed allocations respect auto-lock, preview-then-lock, or manual-approval semantics,
- donation-recipient choice is compatible with the funder’s accepted recipient constraints, and incompatible funding sources are excluded/released safely,
- donor-of-record and donation-receipt treatment is frozen, disclosed, and reconciled without promising unsupported tax deductibility,
- shared consideration-obligation records exist for participant payouts, charitable donations, mixed consideration, fees/withholding, sponsor gap-fill, and releases/refunds before execution,
- disabled feature modules fail closed across UI, API, clearing, jobs, settlement, seed data, and public reporting,
- isolated single pledge-swap lots pass operational-efficiency review or are routed into baskets/batch rounds,
- a participant in a donation-consideration lot or basket item can choose from approved donation recipients before accepting, and that choice is frozen into settlement and receipts,
- a sponsor can create/admin-approve a last-dollar gap-fill commitment that triggers at a frozen threshold, reserves funds, and settles as funding source rather than separate impact,
- a participant can submit a private pledge-swap proposal, see review status, and have safe proposals converted into standardized reviewed lots/baskets while unsafe proposals remain private and rejected/escalated,
- a participant can apply and submit baseline data,
- a participant can use instant-valid enrollment flow or, where enabled, start/join a participant cohort activation group before being asked to perform the action,
- a participant can accept a crowdfunded pledge-swap lot only after the lot is fully funded and reserve/guarantee checks pass, and the UI clearly says not to begin the action before the lot is active,
- admin can select/clear a round based on expected adjusted impact units,
- participant can submit verification evidence,
- verifier can make a verification decision,
- admin can compute and approve settlement,
- funders are charged/released according to settlement logic,
- crowdfunded pledge-swap micro-funders are charged/released according to the frozen lot settlement logic, and the charitable donation/payout/mixed consideration is executed or held/retried according to the frozen policy,
- participants receive computed payouts or simulated payouts,
- a public settlement report is generated,
- public reports and dashboards use public-progress suppression for privacy-sensitive envelopes and do not expose real-time single-participant acceptance or verification states when suppression is configured,
- overfunded lots, oversubscribed baskets, and standing-microfund allocations resolve through the frozen allocation/rationing policy with user-visible receipts or release explanations,
- side effects from material state changes are produced through idempotent domain-event/outbox or equivalent projection-repair infrastructure,
- settlement execution can be safely retried without duplicate money movement,
- settlement creates auditable per-participant payouts, per-pledge funder line items, and per-sponsor matching line items,
- participant payout reserve and payment authorization validity are checked before launch and settlement execution,
- production real-money flows are feature-gated and the simulated provider cannot be used for production money movement,
- provider webhook/asynchronous payment events are persisted and processed idempotently,
- selected paid participants pass identity/Sybil/fraud-risk checks or are blocked/held under the frozen policy,
- frozen verification, dispute, reauthorization, settlement, payout, reserve, shortfall, and notification terms are enforced,
- lifecycle notifications/reminders are generated without leaking sensitive data,
- failed-to-launch or cancelled rounds release authorizations and preserve audit records,
- launched rounds settle from immutable snapshots even if templates are edited later,
- overlapping paid rounds cannot double-credit or double-pay the same raw action units,
- waitlist/control assignment is transparent and consented for follow-up,
- private evidence is role-gated, access-logged, scanned/quarantined where supported, and served without unsafe inline rendering,
- settlement accounting uses balanced ledger entries that reconcile to line items and payment/provider operations,
- public rounds have approved methodology and jurisdiction/availability review snapshots,
- operational dashboards or documented alert hooks exist for stuck jobs, failed webhooks, failed notifications, failed payments, unusual evidence access, and risk-review backlogs,
- server-side services, not client-submitted fields, are authoritative for eligibility, scoring, clearing, verification, settlement, payments, and evidence access,
- audit, notification, payment-provider event, and observability logs redact sensitive values and retain hashes/references for auditability,
- frozen round snapshot hashes are generated before launch and included in settlement/audit outputs,
- unused funder money is rolled over or donated only with explicit compatible consent; otherwise it is released,
- lifecycle status changes are enforced through a server-side state machine with audit and concurrency checks,
- adjusted-unit calculations and payouts use deterministic decimal precision and UTC deadline enforcement,
- SelectionDecision records make participant selection/waitlist/rejection auditable without exposing private data,
- participant-welfare, related-party/self-dealing, AML, and abuse-risk gates block unsafe or exploitative rounds and settlements,
- public/mutation endpoints and evidence uploads have CSRF/session protection, rate limits, and abuse throttling where supported,
- dispute claims and resolutions are stored privately with sanitized participant-visible/public summaries,
- public and funder-facing views redact gaming-enabling thresholds, scores, and risk heuristics while preserving frozen private anti-gaming policy for audit,
- funders and sponsors cannot identify, select, message, or target individual participants outside explicitly approved aggregate or reviewed flows,
- material adverse decisions provide non-sensitive reasons and dispute/appeal paths or are covered by a frozen low-risk automation policy,
- canonical frozen snapshot JSON is stored and hashed deterministically, and settlement/public-report hashes reference it,
- temporal-order validation prevents invalid deadline/action-window configurations,
- credited raw action units are represented by de-duplicated server-side records and consumed once by settlement,
- audit, ledger, review, and state-transition records are append-only in normal operation with correction/reversal workflows,
- sensitive payment, payout, KYC/tax, baseline, and evidence references use protected/tokenized storage and raw instruments/IDs are not stored in group-buying tables,
- production real-money rounds have required legal/compliance reviews for labor/tax/fundraising/payment-provider/jurisdiction constraints,
- payment-provider webhooks are signature-verified, replay-protected, and quarantined on failure before they can affect payment or ledger state,
- out-of-order or stale payment-provider events cannot regress payment, ledger, payout, settlement, or user-visible status,
- emergency pause/kill-switch controls can block unsafe operations without breaking safe withdrawal, dispute, support, and required release/refund paths,
- high-risk admin actions use step-up authentication or recent reauthentication where supported and produce auditable non-secret logs,
- deadline-driven lifecycle, notification, reauthorization, retention, and escalation jobs run idempotently with locks/leases and safe retry behavior,
- retention/deletion and erasure workflows remove or crypto-erase sensitive private payloads when allowed while preserving append-only redacted accountability records and legal-hold blocks,
- public API and public pages use redacted public snapshots and do not expose private anti-gaming, fraud/risk, security, or protected-threshold policy snapshots,
- raw-action-unit de-duplication covers group-buying and existing pledge-swap / moral-trade compensated commitments,
- required migration/backfill jobs for existing pledge-swap / moral-trade compensated commitments are idempotent, reconciled, and fail closed before production cross-feature de-duplication enforcement,
- production real-money rounds have current backup/restore readiness checks and recurring reconciliation runs for settlement, ledger, provider-event, payout-reserve, and credited-action-unit consistency,
- randomized oversubscription has reproducible seed-commitment audit records and cannot be silently rerun to shop for preferred participants,
- evidence workflows minimize and redact unrelated third-party personal data where feasible,
- production secrets and provider credentials are server-only, secret-managed, rotatable, and absent from snapshots/logs/client bundles,
- AI-assisted processing is processor-approved, redacted/sandboxed, prompt-injection-aware, logged, and never solely authoritative for material adverse decisions outside the frozen automation policy,
- user mutation operations that can create obligations or duplicate records are protected by server-side idempotency records or equivalent duplicate-submission controls,
- idempotency-key reuse with mismatched actor, scope, operation type, or request hash fails safely,
- TermsAcceptance records prove acceptance of the exact frozen terms/snapshot hashes required for pledges, enrollments, sponsor pools, payout destinations, launch approval, and settlement approval,
- terms revocation or replacement preserves prior consent evidence and is handled through explicit domain cancellation, withdrawal, dispute, privacy, or repair flows,
- evidence integrity hashes and provenance records exist for original and redacted/sanitized evidence derivatives where feasible,
- hash, HMAC, public identifier, and raw-unit-key derivations are versioned, privacy-preserving, and exposure-controlled,
- material substitution effects, rebound effects, and negative externalities are handled in the frozen methodology and reported safely where relevant,
- moral-impact weights and adjusted units are publicly described as protocol-relative to the frozen moral-view/cause-area summary rather than as platform-endorsed universal moral truth,
- production rollout caps and risk-tier limits are enforced and auditable,
- instant-valid and team-threshold validity modes are frozen in the round snapshot and enforced consistently across UI, clearing, reserve, settlement, expiration, and reporting,
- team invite tokens are hash/protected-reference based, revocable, rate-limited, and never stored or exposed as raw secrets outside the intended user-facing invite URL,
- team-threshold activation uses qualified distinct-member counts and cannot be satisfied by duplicate accounts, related-party clusters, or disqualified members,
- cached team counters are never authoritative for activation, clearing, settlement, or public progress; activation decisions recompute or transactionally verify qualified members under locks,
- team activation windows satisfy temporal-order constraints relative to enrollment, launch, selection, and action-window deadlines,
- user receipts/proofs exist for material commitments and outcomes and are available from user dashboards/support flows without leaking private internals,
- adverse-decision and dispute/appeal deadlines are tied to participant/funder-visible decision timestamps, with safe holds/extensions when notice or receipt delivery fails,
- unclaimed payouts and abandoned balances remain ledger-visible liabilities and follow frozen retry/hold/expiry/escheatment or compliance-disposition rules,
- off-platform side payment, private compensation, or contact-circumvention flows are not facilitated and user reports are routed to review or dispute handling,
- team activation effect/capacity semantics are explicit: activation either grants eligibility, reserves capacity, or selects atomically, and user-facing labels distinguish these states,
- pending or expired team-threshold commitments never count as activated commitments or participant-payout reserve support,
- payout destinations are verified and snapshotted before payout, and failed/unclaimed payouts follow frozen retry/hold/expiry rules,
- gross participant payouts, tax/compliance withholding, platform fees, provider fees, rounding deltas, and net provider payouts are disclosed where appropriate and reconcile exactly across settlement, ledger, payment, and dashboard records,
- behavior-change equivalence-group controls prevent repeat-participation, cooldown, additionality, and anti-threat evasion across related templates,
- public impact reports preserve the no-trade-baseline invariant by separating verified adjusted units from any net-impact claims and by aggregating/suppressing funder-counterfactual information,
- review queues support feasible blinding/minimization and reviewer-quality audits for high-risk or sampled decisions,
- incident-response records support severity, containment, public-message, postmortem, and production-blocking workflows for safety/privacy/security/payment/compliance/AI/participant-welfare incidents,
- core participant and funder flows satisfy documented accessibility/comprehension checks,
- funder and participant dashboards provide server-computed next-action timelines and receipt/statement views that reconcile to terms, settlement, ledger, payment, and payout records,
- commitment summary cards and server-derived “what happens next” steppers are present for pledge, enrollment, team join, evidence, withdrawal, and payout flows,
- public round/report/user text is sanitized before rendering,
- notification-channel preferences are respected for optional notices while critical transactional notices remain deliverable under the frozen policy,
- research/data-use controls prevent unsupported use of waitlist/control/follow-up data beyond ordinary round administration,
- core settlement, ledger, payment, lifecycle, credited-action-unit, idempotency, and public/private-snapshot invariants are covered by property-based/fuzz testing where supported or deterministic invariant test matrices otherwise,
- PurchaseEnvelopeRegistry, FundingSourceCommitment, ParticipantActionCommitment, FundingSettlementLineItem, and envelope-scoped Settlement records are used by lots and baskets rather than round-only settlement paths,
- lots and baskets can settle without a round-scoped ParticipantEnrollment when a ParticipantActionCommitment exists and passes verification,
- ordinary users see intent-based navigation and canonical public state labels rather than internal architecture or raw lifecycle codes,
- public lots and baskets default to anonymous participant supply and participant-specific disclosure is blocked unless explicit participant opt-in and reviewed welfare/privacy policy exist,
- proportional verification-burden policy and operational-efficiency review prevent low-value single lots from imposing disproportionate evidence, payment, support, or privacy costs,
- donation-recipient approval freshness is checked before obligation lock and donation execution, and expired or blocked recipients trigger frozen fallback/cancellation/shortfall rules,
- staged capability rollout allows adjusted-impact rounds, lots, baskets, standing pools, wallet/stored-balance support, donation execution, and production real-money movement to be enabled independently with fail-closed disabled-module behavior,
- all tests/lint/build pass.
- shared purchase-envelope registry, action-commitment, and frozen-policy-bundle records exist for all enabled envelope types and reconcile to envelope-specific tables, settlement plans, receipts, and public/private serializers.
- fixed-consideration lots and baskets preserve separate consideration accounting, protocol impact accounting, and net-impact claims in settlement previews, public reports, and user receipts.
- single-participant lot privacy defaults prevent identity, story, baseline, evidence, and charity-choice disclosure unless a reviewed, separate, post-settlement participant publicity opt-in exists.

- user-facing labels, CTAs, and dashboard state summaries follow the UX/language simplification layer and do not require ordinary users to understand internal object names,
- public/funder/participant/sponsor pages use progressive disclosure so core obligations are visible immediately and advanced methodology/policy/hash details remain accessible but not overwhelming,
- every material user commitment has a plain-language commitment card and server-derived next-action stepper,
- funder, participant, sponsor, and public reports use precise money/action/status language, distinguishing authorization from charge, funding from acceptance, selection from activation, and verification from final settlement,
- standing microfund pools and allocation receipts are understandable without exposing internal allocation algorithms or private participant/risk data,
- admin/reviewer/operations UI provides simplified checklists and action-required queues while retaining full audit, policy, settlement, and evidence access under role controls,

16. Implementation constraints
- Preserve existing Moral Trade functionality.
- Do not remove or degrade existing pledge-swap marketplace behavior.
- Do not create user-generated threat markets.
- Do not route standing microfund allocations, rollover funds, or micro-pledges into lots, baskets, recipients, cause areas, jurisdictions, consideration types, or verification standards outside the user's frozen constraints.
- Do not execute a settlement from an approved SettlementPlan if the underlying funding-source set, recipient-compatibility check, credited-action-unit set, consideration-obligation set, fee lines, or ledger plan has changed; recompute and reapprove instead.
- Do not allow payment/provider/platform fees or verification/review burdens to dominate low-value lots unless a frozen reviewed waiver explains why the lot remains worthwhile and users see the fee/burden disclosure.
- Do not use post-settlement calibration to retroactively change frozen participant obligations, donation/payout obligations, funder charges, settled reports, or dispute deadlines; calibration may only update future methodology versions through review.
- Do not publish unsafe or harmful coordination templates merely because some users request them.
- Do not expose private evidence.
- Do not retain sensitive private evidence longer than the documented retention period unless required for an active dispute or legal/compliance reason.
- Do not satisfy privacy deletion or erasure requests by mutating or deleting append-only accountability records; redact, tombstone, delete blobs/tokens, crypto-erase protected payloads, and preserve only non-sensitive hashes/references unless a legal/compliance hold applies.
- Do not enroll minors in paid behavior-change rounds unless a legally reviewed guardian-consent and payout-compliance flow exists.
- Do not overclaim impact; phrase results as “adjusted impact units under this protocol,” and do not imply net social impact relative to the no-trade baseline unless funder-side counterfactuals, substitution effects, and methodology assumptions support that claim.
- Do not frame ordinary funding, lots, baskets, or microfund allocations as offsets, indulgences, or permission for the funder to perform harmful behavior unless the envelope is an explicitly reviewed offset template with frozen offset-specific methodology and public-reporting limitations.
- Do not present protocol-specific moral-impact weights, moral-view summaries, or cause-area assumptions as the platform's universal moral view; clearly distinguish protocol-relative scoring from platform endorsement.
- Do not expose private funder-counterfactual notes; publish only aggregated/suppressed counterfactual summaries where the frozen privacy and public-reporting policy permits it.
- Do not publish small-cell public-report statistics that could reveal sensitive participant behavior or identity.
- Do not count sponsor matching and ordinary funder money as separate impact for the same adjusted units.
- Do not count or pay the same participant’s same raw action units in multiple overlapping rounds.
- Do not count pending, expired, cancelled, or blocked team-threshold pledges/enrollments toward launch, reserve, public activated progress, settlement, or impact reporting.
- Do not rely on denormalized team counters, progress bars, public counts, or cached activation status as the authority for threshold success; recompute or transactionally verify qualified members before activation and before any money, capacity, or selection consequence.
- Do not allow team activation windows to extend past frozen enrollment/launch deadlines or into an action window in a way that pressures participants to act before activation and selection.
- Do not use team-threshold leaderboards, shame lists, identity-revealing social proof, or coercive invitation copy unless an explicit reviewed policy permits the flow.
- Do not count duplicate, related-party-disqualified, blocked, withdrawn, expired, or otherwise unqualified members toward team-threshold co-funder/co-participant counts.
- Do not let team-threshold validity make an activated selected participant’s post-action payout depend on later group success, co-funder retention, or co-participant completion.
- Do not label a team as “confirmed,” “selected,” or “owed” merely because its threshold was met unless the frozen activation effect reserves capacity/budget or performs final selection atomically.
- Do not ask a pending team-threshold participant to begin the action before their activation group has succeeded under the frozen activation policy.
- Do not store raw team invite tokens in ordinary database rows, logs, analytics, snapshots, or admin lists; store only hashes/protected references and expose the raw invite URL only to the intended user at creation/display time.
- Do not use expired payment authorizations or settlement-stage conditional funds to satisfy participant-payout guarantees.
- Do not enable production real-money rounds with the simulated payment provider or with missing payment-webhook, compliance, privacy, support, or dispute workflows.
- Do not enable production real-money funding, enrollment, sponsor matching, or payouts in unsupported jurisdictions.
- Do not publish live rounds with unreviewed or silently mutable moral-impact weights, additionality priors, persistence multipliers, raw-unit definitions, or material substitution/spillover assumptions.
- Do not let participants evade repeat-participation caps, cooldowns, additionality penalties, or anti-threat controls by moving between materially equivalent behavior-change templates.
- Do not treat PaymentOperation rows alone as the accounting ledger; reserve, rollover, payable, shortfall, fee, and provider-clearing balances must reconcile through ledger entries or an existing equivalent accounting system.
- Do not allow reviewers to access uploaded private evidence before file validation/scanning/quarantine policy has run, except through an explicitly logged emergency/admin override.
- Do not expose avoidable participant/funder identity, payout size, or other biasing context to reviewers where blinding/minimization is feasible; do not skip required review-quality audits for high-risk or sampled decisions.
- Do not claw back participant payouts validly owed under frozen terms because of later funder capture failure, payment reversal, chargeback, or operational shortfall.
- Do not include sensitive evidence, baseline facts, payment references, or fraud/safety reasons in email/SMS/push notifications.
- Do not let adverse-decision or dispute/appeal deadlines silently expire before the affected user has a participant/funder-visible decision record; notification or receipt-generation failures must trigger the frozen hold, extension, or support path.
- Do not trust client-submitted scores, statuses, prices, eligibility outcomes, payment amounts, verification outcomes, or evidence-access permissions; recompute or authorize them server-side.
- Do not write raw sensitive values into AuditEvent snapshots, NotificationLog metadata, PaymentProviderEvent payloads, observability logs, or debugging traces; store redacted payloads plus hashes/references instead.
- Do not rollover or donate unused funder money to another round without explicit funder consent and compatible frozen successor-round terms; release the authorization instead.
- Do not convert failed, abandoned, unclaimed, or expired payout balances into platform revenue unless a legally reviewed unclaimed-property/abandonment policy explicitly permits the disposition and all required notice, ledger, tax, and compliance steps have been completed.
- Do not mutate round lifecycle status directly outside the audited state-machine service except through documented repair tooling.
- Do not use binary floating-point arithmetic for adjusted impact units, probabilities, cost-per-unit comparisons, or payout calculations.
- Do not use protected attributes or sensitive proxies for participant selection, pricing, or eligibility unless explicitly approved through legal and participant-welfare review.
- Do not target paid behavior-change rounds at financially vulnerable users or other vulnerable groups in a predatory way.
- Do not allow related-party, self-dealing, AML, or circular-funding patterns to bypass risk review.
- Do not store ambiguous local-only deadline times; store canonical UTC instants and display localized times from the frozen timezone policy.
- Do not expose private dispute claims/resolutions; publish only sanitized public summaries where appropriate.
- Do not disclose exact baseline thresholds, selection scores, risk heuristics, fraud triggers, or anti-threat rules when disclosure would materially increase gaming, baseline manipulation, or threat adaptation.
- Do not let funders or sponsors identify, message, select, approve, reject, or target individual participants outside a specifically reviewed and frozen interaction policy.
- Do not facilitate off-platform side payments, private compensation promises, or user contact flows designed to bypass group-buying verification, payout, tax, AML/sanctions, reserve, anti-threat, privacy, or participant-welfare controls.
- Do not finalize material adverse decisions solely from opaque automation unless the frozen low-risk automation policy permits it and the affected user has the promised explanation/dispute path.
- Do not deploy public mutation endpoints, evidence uploads, or admin actions without the repository’s applicable CSRF/session, rate-limit, and abuse-throttling protections.
- Do not compute round snapshot hashes from non-canonical JSON serialization or mutable database state, and do not omit the hash algorithm and canonicalization version from records that rely on those hashes.
- Do not launch rounds with invalid temporal ordering of UTC deadlines, action windows, dispute windows, reauthorization deadlines, settlement timing, or payout timing.
- Do not mutate append-only audit, review, ledger, state-transition, or payment-event history in normal operation; use corrective, reversal, or superseding records instead.
- Do not settle from aggregate raw-unit counts alone when credited-action-unit records are available; settlement must consume de-duplicated raw action unit records exactly once. Do not use raw personal data, raw baseline data, raw payout data, or publicly reconstructable action-window strings as raw_unit_key values.
- Do not store raw card numbers, raw bank-account numbers, raw government IDs, or raw KYC documents in group-buying tables; use payment/compliance-provider tokens or a compliant vault/storage layer.
- Do not open production real-money rounds without required legal/compliance review for labor/gig-work classification, tax reporting/withholding, charitable solicitation or fundraising, payment-provider acceptable use, AML/sanctions, and payout legality.
- Do not expose private frozen policy snapshots, anti-gaming thresholds, fraud/risk heuristics, security policies, or protected scoring thresholds through public APIs, public pages, funder/sponsor dashboards, or public snapshot exports.
- Do not treat group-buying de-duplication as isolated from the existing pledge-swap marketplace; paid raw-action-unit conflicts across Moral Trade features must be detected before launch and settlement.
- Do not enable production cross-feature de-duplication against existing pledge-swap / moral-trade agreements until required backfills, adapter checks, and reconciliation reports have passed or the affected templates remain disabled.
- Do not rerun oversubscription randomization after seeing results except through an audited override path with a recorded reason.
- Do not require or encourage participants to upload third-party personal data; where such data appears in evidence, redact or tombstone it when it is not needed for verification, dispute, legal, or compliance reasons.
- Do not store provider credentials, webhook signing secrets, encryption keys, or feature-flag secrets in code, seed data, client bundles, snapshots, ordinary database columns, logs, or analytics.
- Do not silently cancel, redirect, or appropriate failed, abandoned, or unclaimed participant payouts; apply the frozen unclaimed-payout policy and preserve participant-facing status/support paths.
- Do not hide platform fees, provider fees, tax withholding, or other deductions inside adjusted-unit pricing or payout labels; disclose and reconcile gross payout, deductions, and net payout under the frozen terms.
- Do not use participant-payout reserve funds for platform fees, provider fees, or unrelated operating costs unless the frozen terms explicitly allocate that cost without reducing validly owed gross participant payout obligations.
- Do not process payment-provider webhook events that fail signature verification, timestamp tolerance, provider authenticity, or replay checks.
- Do not let stale or out-of-order payment-provider events regress local payment, ledger, settlement, payout, or user-visible status.
- Do not perform high-risk production admin actions such as launch, unpause, settlement approval/execution, payout execution, evidence export, or override of safety/fraud/compliance holds without configured step-up authentication or documented equivalent controls.
- Do not continue funding, enrollment, evidence intake, clearing, settlement, payout, or notifications when an active operational pause blocks that operation; only preserve explicitly permitted safe flows such as withdrawal, support, disputes, and required releases/refunds.
- Do not ignore unresolved high-severity or critical safety, privacy, security, payment, legal/compliance, AI-processing, or participant-welfare incidents when the frozen incident policy requires containment, production blocking, user-safe communication, or postmortem.
- Do not implement deadline-driven transitions, reminders, releases, settlement steps, or retention/deletion actions as non-idempotent ad hoc cron scripts; use the repository’s job queue or DeadlineJob-equivalent locking and idempotency pattern.
- Do not send private baseline data, private evidence, payment/KYC/tax references, fraud/risk rationales, or private policy snapshots to external AI/ML/LLM processors without an approved subprocessor/privacy/security policy and any required consent/compliance basis; do not use private group-buying data to train external models without a separate approved flow.
- Do not let AI/ML/LLM outputs become the sole basis for material adverse decisions unless the frozen low-risk automation policy explicitly permits it and the promised explanation/dispute path exists.
- Do not allow retries, double-clicks, browser resubmits, or background retries to create duplicate pledges, enrollments, evidence uploads, disputes, appeals, payout-destination records, or high-risk admin approvals.
- Do not accept an idempotency-key replay with a different actor, scope, operation type, or request hash as if it were the original operation.
- Do not rely on accepted_at timestamps alone as proof of consent to frozen terms; use TermsAcceptance records that reference the relevant terms/snapshot hashes.
- Do not treat terms revocation, withdrawal, privacy erasure, or payout-destination replacement as a mutation or deletion of the original consent record, and do not use revocation to retroactively erase obligations or permissions validly created under frozen terms.
- Do not launch or scale public real-money rounds beyond configured rollout caps, risk tiers, jurisdiction scope, participant count, total authorized funds, or payout limits without the frozen cap-increase review path.
- Do not launch or scale production real-money rounds without documented backup/restore readiness and current reconciliation checks for ledger, settlement, provider-event, payout-reserve, and credited-action-unit records; backups must not retain or reintroduce private payloads that were erased under the retention policy.
- Do not rely only on example-based tests for settlement/payment/ledger/lifecycle invariants where property-based or fuzz-style testing is available in the repository; otherwise document deterministic invariant matrices covering equivalent retry/interleaving cases.
- Do not make deadline, payment, withdrawal, adverse-decision, or dispute information inaccessible to users who rely on keyboard navigation, screen readers, mobile layouts, or non-color cues.
- Do not make users infer their next required action or financial status from raw lifecycle codes; provide server-computed status timelines and receipt/statement views for active obligations, authorizations, charges, releases, verification, disputes, payouts, fees, and withholding.
- Do not use real-time public progress, funding totals, or participant-state labels to reveal private participant acceptance, withdrawal, evidence, verification, or charity-choice status for single-participant or small-cell envelopes when the frozen public-progress-suppression policy requires coarsening, delay, or aggregation.
- Do not silently allocate standing microfund pools or overfunded micro-pledges based on platform revenue, hidden sponsorship priorities, or unsupported recipient preferences; allocation must follow the frozen allocation/rationing policy and user constraints.
- Do not render public round descriptions, public reports, public messages, participant-visible reasons, or user-generated public text without the frozen public-content sanitization/allowlist policy.
- Do not send optional lifecycle, marketing, or reminder notifications through channels the user has opted out of; do not suppress critical transactional, legal, safety, deadline, dispute, or payout notices required under the frozen policy.
- Do not use waitlist/control or follow-up data for research, publication, external sharing, model training, or cross-round analytics beyond ordinary round administration without the required frozen data-use consent or approved basis.
- Do not bypass the shared purchase-envelope registry, ParticipantActionCommitment records, or frozen-policy-bundle manifest when implementing an envelope-specific shortcut for lots, baskets, standing pools, or imported pledge-swap agreements.
- Do not present fixed-consideration pledge-swap donations or payouts as a per-adjusted-unit price, cost-effectiveness claim, or net-impact estimate unless the frozen methodology explicitly supports that calculation and public reporting keeps the accounting layers separate.
- Do not publish or imply participant identity, story, baseline, charity choice, or evidence details for a single-participant lot before the participant separately opts into publicity after settlement and the publicity review approves the disclosure.
- Do not treat crowdfunded pledge-swap lots as ordinary user-generated contracts. Lots involving behavior change, charitable donation, participant payout, or moral-impact claims must use approved templates, approved donation recipients where relevant, safety/methodology/participant-welfare review, immutable terms, reserve checks, and anti-threat controls.
- Do not ask a participant in a crowdfunded pledge-swap lot to begin the action until the lot is fully funded, the participant has accepted the frozen terms, the donation/payout/mixed-consideration reserve or guarantee has passed, and all required risk/compliance checks are clear.
- Do not present a crowdfunded pledge-swap lot as “funded,” “accepted,” “active,” “verified,” “owed,” “donated,” or “settled” unless the corresponding server-side state and ledger/payment/donation records support that exact label.
- Do not promise sub-dollar real-money micro-pledges in production unless the configured payment provider, fee policy, compliance review, and batching/internal-balance policy support them; otherwise enforce a higher minimum while preserving the same model.
- Do not implement standing microfund pools as stored user balances, wallets, or internal credits in production unless custody, stored-value, money-transmission, unclaimed-property, reconciliation, and user-funds segregation requirements have been explicitly reviewed and enabled; otherwise use constrained authorizations or allocation preferences.
- Do not count a micro-pledge, standing-pool allocation, or sponsor gap-fill commitment toward a participant-selected donation recipient unless that funding source accepted the recipient list, cause-area scope, and donor-of-record policy frozen for that lot/basket.
- Do not imply that micro-funders are the legal donors of record, receive tax-deductible receipts, or control restricted charitable funds unless the frozen donor-of-record/tax-receipt policy and provider integration support those claims.
- Do not publish isolated single pledge-swap lots whose expected verification/payment/support overhead or privacy risk violates the frozen operational-efficiency policy unless a reviewer-approved rationale is recorded.
- Do not expose internal lifecycle codes as the primary ordinary-user UI; use plain-language state labels and progressive disclosure while keeping detailed audit/ledger/snapshot data accessible in receipts and admin views.
- Do not let later micro-funder payment failure, chargeback, expired authorization, or withdrawal reduce a fixed donation/payout/mixed consideration validly owed after the participant verifies the action under the frozen pledge-swap lot terms.
- Do not treat a crowdfunded pledge-swap basket as merely several unrelated lots when settlement, replacement, public reporting, reserve accounting, or microfund allocation requires basket-level invariants.
- Do not allocate from a standing microfund pool outside the funder's frozen cause-area, template, consideration-type, recipient, amount, period, or jurisdiction constraints, and do not continue allocating after the pool is paused, cancelled, exhausted, or blocked.
- Do not imply that a donation to an “effective charity” is participant compensation unless the participant selected or accepted that recipient under the frozen terms.
- Do not trigger last-dollar sponsor matching without the frozen threshold, reserve, expiration, sponsor terms, and line-item/reconciliation records needed to make the commitment auditable and non-misleading.
- Do not publish participant-proposed lot text, threat-framed proposals, private review rationales, or rejected proposal details; only standardized reviewed lots/baskets may become public.
- Do not implement lots, baskets, standing pools, sponsor gap-fill, or donation operations as separate one-off settlement paths that bypass PurchaseEnvelopeRegistry, FundingSourceCommitment, ParticipantActionCommitment, ConsiderationObligation, FundingSettlementLineItem, ledger, receipt, or reconciliation invariants.
- Do not require a round-scoped ParticipantEnrollment as the sole representation of a participant action for lots or baskets; use ParticipantActionCommitment or an equivalent adapter so non-round envelopes can verify and settle safely.
- Do not publicly identify participants in single-lot or basket-item pages by default. Named participant lots require explicit participant opt-in, reviewed privacy/welfare approval, and public copy that avoids pressure or harassment.
- Do not show “fully funded” as “participant confirmed,” “action started,” or “consideration owed.” Use canonical envelope state groups that distinguish funding, participant acceptance, active action, verification, earned obligation, settlement, release, and cancellation.
- Do not open or lock low-value single lots with evidence requirements that are disproportionate to expected impact unless a reviewer-approved operational-efficiency and verification-burden rationale is frozen.
- Do not execute or lock charitable-donation obligations when donation recipient due diligence, payment-destination verification, sanctions/AML status, jurisdiction support, or effectiveness-evaluation freshness has expired or become blocked, except through the frozen fallback/shortfall policy for already-earned obligations.
- Do not expose internal architecture labels such as PurchaseEnvelopeRegistry, FundingSourceCommitment, ConsiderationObligation, or raw state-machine codes in ordinary user-facing UX.
- Do not make ordinary users choose between mechanism names such as pledge-swap lot, basket, envelope, activation, settlement, or policy bundle when a concrete action-first label such as “fund one verified action,” “fund several similar actions,” or “set a recurring budget” would be sufficient.
- Do not duplicate simple status text outside tested server-side presenters/serializers; user-facing summaries must be derived from authoritative state and receipt records.
- Use existing style/components.
- Add concise developer docs explaining the mechanism, formulas, statuses, and how to seed/test it.
- Run the project’s test, lint, typecheck, and build commands. Fix failures before finishing.

Deliverables:
- Code changes implementing the feature.
- Database migrations or schema updates.
- Seed/demo data.
- Tests.
- UX/content simplification notes explaining the action-first labels, one-screen deal card, Level 1/Level 2/Level 3 disclosure model, server-generated status presenters, status sentence templates, copy-lint rules, failure-message templates, receipt timeline, guided standing-budget flow, and private proposal intake copy.
- Developer documentation.
- Privacy/retention notes for sensitive evidence, baseline data, private disputes, redacted audit/notification/provider-event logging, erasure/tombstone/legal-hold behavior, and public-report small-cell suppression.
- Public/private snapshot notes explaining which fields are exported publicly, which frozen policies remain private, and how snapshot hashes are verified without leaking gaming-enabling thresholds.
- Cryptographic hash and identifier notes explaining canonicalization, hash algorithms, HMAC/keyed-hash use, raw_unit_key derivation, public-safe identifiers, sensitive-hash redaction, key rotation, and what hash values may or may not be exposed publicly.
- No-trade-baseline and impact-claims notes explaining how verified adjusted units, participant additionality, funder-side counterfactuals, substitution/rebound/externality adjustments, and net-impact claims are separated in public reports.
- Protocol-relative moral-view/cause-area notes explaining how moral-impact weights operationalize a disclosed moral view or funder constituency without implying platform endorsement of a universal moral theory.
- Cross-feature double-counting notes explaining how group-buying CreditedActionUnit records interoperate with existing pledge-swap / moral-trade compensated commitments.
- Migration/backfill notes explaining safe schema changes, pledge-swap adapter backfills, dry-run counts, idempotency, reconciliation reports, rollback/repair paths, and fail-closed production enforcement.
- Randomization-integrity notes explaining eligible-set freezing, seed commitment/reveal, reproducibility, override handling, and anti-rerandomization controls.
- Group-buy validity-mode and team-activation notes explaining instant-valid versus team-threshold rounds, activation scopes, co-funder/co-participant thresholds, activation windows, pending/activated/expired states, activation-effect semantics, capacity/budget reservation behavior, invite-token hashing/revocation, distinct-qualified-member counting, expiration jobs, invite-abuse controls, reserve treatment, user notifications, and why post-action participant payouts are not contingent on later group behavior.
- Crowdfunded pledge-swap lot notes explaining how many micro-funders can jointly fund one fixed pledge-swap consideration, how $0.50-style contributions are represented and constrained by provider minimums, how donation-consideration lots choose approved charities, how participants accept fixed obligations, how reserves protect the promised donation/payout, and how settlement/donation receipts/public reports work.
- Crowdfunded pledge-swap basket notes explaining basket-level clearing, per-item obligations, participant replacement, aggregate settlement/reporting, microfund allocation, reserve handling, and privacy advantages over isolated single lots.
- Standing microfund pool notes explaining recurring/one-time budgets, per-lot/per-basket caps, allocation strategies, wallet/batching/provider-minimum handling, pause/cancel behavior, allocation receipts, and budget reconciliation.
- Participant donation-recipient choice notes explaining approved recipient lists, choice timing, frozen selected-recipient snapshots, fallback behavior, related-party/AML review, and why participant acceptance is required for donation consideration to count as compensation.
- Last-dollar sponsor matching notes explaining threshold triggers, reserve treatment, sponsor line items, expiration/release, public-reporting treatment, and why matched funds do not create duplicate impact claims.
- Participant-proposed private lot intake notes explaining private proposal submission, anti-threat review, conversion to standardized lots/baskets, rejection/escalation, access controls, and non-public handling of raw proposal text.
- Team-counter reconciliation and anti-coercive UX notes explaining why cached counts are non-authoritative, how qualified members are recomputed, and how leaderboards, shame lists, identity-revealing social proof, and pressure copy are avoided.
- Payment/compliance integration notes for production authorization, capture, payout, KYC/tax, sanctions screening, webhook idempotency, chargebacks/reversals, shortfalls, jurisdiction availability, and feature-gating.
- Ledger/accounting notes explaining account types, balanced entries, reserve segregation, reconciliation, rollovers, shortfalls, provider-clearing accounts, and operational repair workflows.
- Backup/restore and disaster-recovery notes explaining protected backups, restore drills, retention/erasure compatibility, reconciliation after restore, and production readiness criteria.
- Notification/reminder notes explaining lifecycle events, sensitive-data redaction, delivery channels, and retry behavior.
- Fraud/risk-review notes explaining identity, Sybil, evidence, baseline, payment, AML, related-party/self-dealing, participant-welfare, adverse-decision handling, jurisdiction, and abuse checks with privacy minimization.
- Off-platform-circumvention notes explaining how private side-payment, private contact, compensation-circumvention, coercion, and invite-pressure reports are detected, reviewed, escalated, and resolved.
- Anti-gaming and participant/funder interaction notes explaining which thresholds, scores, and heuristics are public vs private, how funders/sponsors are kept aggregate-only, and how adverse decisions are explained or appealed.
- Evidence-upload security notes explaining file limits, scanning/quarantine, signed URLs, metadata stripping, third-party personal-data redaction, preview sanitization, retention, and deletion.
- Methodology-review notes explaining raw-unit definitions, additionality priors, verification-confidence interpretation, moral-impact weights, persistence multipliers, material substitution/spillover assumptions, public methodology summaries, anti-gaming redactions, and version freezing.
- Participant-welfare and anti-exploitation notes explaining compensation fairness, burden review, protected-attribute/proxy policy, vulnerability risks, and withdrawal rights.
- Observability/runbook notes explaining alerts, dashboards, stuck-job recovery, failed webhook handling, failed notification handling, failed payment operation recovery, and unusual private-evidence access review.
- Incident-response notes explaining incident severity, ownership, containment, linked operational pauses, user-safe public messaging, postmortem requirements, and production-blocking rules.
- Reviewer-quality and blinding notes explaining which review queues are blinded/minimized, when second review or sampling applies, how reviewer disagreement/correction is handled, and how calibration is audited.
- Recurring reconciliation notes explaining scheduled settlement/ledger/provider/payout-reserve/credited-action-unit checks, stale reconciliation blocking rules, discrepancy triage, and repair workflows.
- Webhook-security notes explaining provider signature verification, timestamp tolerance, replay protection, out-of-order/stale event handling, quarantine behavior, and idempotent processing.
- Emergency-pause notes explaining pause scopes, safe flows preserved during pauses, unpause approval, public messages, and incident/audit handling.
- Deadline-job notes explaining scheduled lifecycle transitions, verification/dispute/reauthorization deadlines, retention/deletion jobs, locking/idempotency, retry behavior, stale-job escalation, and safe repair workflows.
- Step-up-authentication notes explaining which admin actions require recent re-authentication or MFA-equivalent controls and how such checks are tested without logging secrets.
- Settlement/cancellation notes explaining line items, snapshot hashes, calculation hashes, retry behavior, reserve solvency, authorization expiry, ledger reconciliation, failed/unclaimed payout handling, and failed-round handling.
- User-receipt and adverse-decision deadline notes explaining receipt generation, redacted user-facing proof identifiers, visible-decision timestamps, notice failures, deadline holds/extensions, and support escalation.
- Unclaimed-payout and abandoned-balance notes explaining retry, hold, expiry, participant contact, escheatment/unclaimed-property review, remittance, ledger liability treatment, and why balances cannot default to platform revenue.
- Credited-action-unit and double-counting notes explaining raw-unit keys, overlap detection, de-duplication, reversals, and settlement consumption.
- Append-only audit/ledger/review notes explaining correction, reversal, supersession, and repair workflows.
- Legal/compliance review notes explaining labor/gig-work classification, tax reporting, charitable solicitation/fundraising, payment-provider acceptable use, AML/sanctions, and jurisdiction gating.
- Sensitive-data protection notes explaining tokenization/encryption/vaulting for payment, payout, KYC/tax, baseline, evidence, private rationale references, provider credentials, webhook secrets, encryption keys, and rotation/revocation procedures.
- AI/ML/LLM processing notes explaining approved processors, redaction/sandboxing, prompt-injection protections, no-training rules, human-review boundaries, and AIProcessingLog audit behavior.
- Mutation-idempotency notes explaining idempotency keys, request hashing, mismatch rejection, duplicate submission handling, retry behavior, and retention of MutationIdempotencyRecord entries.
- Terms-acceptance notes explaining snapshot-hash proof of consent for participant, funder, sponsor, payout-destination, and admin terms.
- Terms-revocation notes explaining how withdrawal, cancellation, replacement, privacy requests, and repair workflows preserve prior consent proof without retroactive obligation erasure.
- Fee/withholding and gross-net-payout notes explaining platform fees, provider fees, tax/compliance withholding, rounding deltas, reserve funding source, participant-facing disclosure, and reconciliation to ledger/payment operations.
- Behavior-change equivalence notes explaining repeat-participation groups, cooldowns, additionality penalties, anti-threat controls across related templates, and how equivalence keys are reviewed.
- Invariant/property-based testing notes explaining which settlement, payment, ledger, lifecycle, idempotency, credited-action-unit, and public/private-snapshot invariants are tested by property-based/fuzz tests or deterministic invariant matrices.
- Rollout-cap and risk-tier notes explaining production caps, cap utilization, cap-increase approval, private beta/general-public gates, and fail-closed behavior when caps are exceeded.
- UX/content simplification notes explaining role-based entry points, user-facing product labels, progressive disclosure, canonical state labels, plain-language commitment cards, terminology restrictions, dashboard next-action language, and admin/reviewer checklist UX.
- Accessibility/comprehension notes explaining keyboard/screen-reader/mobile support, deadline/payment clarity, non-color cues, and user-facing error recovery for core flows.
- User-status and receipt/statement notes explaining server-computed next-action timelines, funder/participant receipts, accepted-terms hashes, charge/release/payout line items, fee/withholding visibility, and reconciliation to ledger/payment records.
- Commitment-summary and user-state-stepper notes explaining pledge/enrollment/team/evidence/withdrawal/payout summaries, server-derived states, stale-tab recovery, and copy rules distinguishing pending, activated, selected, confirmed, expired, and released states.
- Public-content sanitization notes explaining rich-text allowlists, URL/media restrictions, markdown handling, public-message previews, and XSS/tracking-pixel prevention.
- Notification-preference notes explaining optional versus critical transactional notices, consent basis, channel fallback, opt-out handling, and jurisdiction-specific delivery constraints.
- Research/data-use notes explaining waitlist/control follow-up consent, ordinary administration versus research/product analytics, publication/external-sharing/model-training restrictions, minimization, retention, and withdrawal handling.
- Server-side authorization/security notes explaining which fields are never trusted from the client and how tampering is tested.
- State-machine/security notes explaining allowed lifecycle transitions, CSRF/session protections, rate limits, abuse throttles, deterministic decimal arithmetic, and UTC/display-timezone handling.
- Additionality/control notes explaining consent, waitlist/control handling, and how control data can or cannot affect payouts, charges, reporting, and future priors.
- Domain-event-outbox and projection-repair notes explaining state-change event publication, idempotent consumers, notification/receipt/public-progress projection updates, retry behavior, and stale-projection repair.
- Allocation/rationing notes explaining overfunding, oversubscription, standing-microfund routing, near-clearing allocation, pro-rata/seeded/user-ranked alternatives, platform-revenue exclusion, and user-visible allocation explanations.
- Offset/moral-licensing copy notes explaining when offset framing is prohibited, when an envelope may be an approved offset template, and how public copy avoids implying permission to perform harmful behavior.
- User-comprehension-check notes explaining which flows require teach-back or confirmation, how prompts are snapshotted, how failures route to support or manual review, and why comprehension checks cannot be used to block lawful withdrawal or disputes.
- Public-progress suppression notes explaining coarsening, delay, aggregation, and single-participant privacy protections for public funding, acceptance, evidence, verification, and donation/payout states.
- Purchase-envelope/action-commitment architecture notes explaining the shared registry, action commitments, envelope-specific tables, deadline-job routing, dashboard state, support lookup, settlement routing, and cross-feature pledge-swap adapters.
- Frozen-policy-bundle notes explaining policy components, bundle manifests, component compatibility checks, public/private policy exports, canonicalization, hash verification, supersession, and fail-closed behavior.
- Impact-accounting separation notes explaining fixed consideration, adjusted impact units, and optional net-impact claims for rounds, pledge-swap lots, baskets, standing-pool allocations, and public reports.
- Single-participant privacy/publicity notes explaining default pseudonymous display, post-settlement opt-in, publicity review, revocation-for-future-use, small-cell suppression, and why publicity cannot be bundled with compensation or action acceptance.
- Standing microfund explainability notes explaining matched/skipped opportunity reasoning, allocation constraints, auto-lock/preview/manual modes, budget remaining, and user-visible allocation audit trails.
- Shared purchase-primitives notes explaining PurchaseEnvelope, FundingSource, ConsiderationObligation, CreditedActionUnit, and SettlementPlan abstractions and how they prevent divergent round/lot/basket settlement paths.
- Feature-dependency notes explaining module prerequisites, incompatibilities, jurisdiction gates, disabled-module fail-closed behavior, and how capability dependencies are tested.
- SettlementPlan notes explaining plan creation, plan hashes, approval, supersession, stale-plan rejection, and execution reconciliation.
- Fee-ratio and operational-burden notes explaining provider/platform fee caps, batching, routing, low-value lot review, verification-burden proportionality, and user-facing fee/efficiency disclosure.
- Forecast/calibration notes explaining PurchaseEnvelopeForecast, MechanismCalibrationRun, expected-vs-actual reports, methodology-update proposals, and the prohibition on retroactive obligation changes.
- Funding-source routing notes explaining consent-preserving routing from micro-pledges and standing pools into near-clearing lots/baskets/successors with user-visible explanations and cancellation windows.
- Feature-capability gating notes explaining module enablement, dev/private-beta/production states, jurisdiction/risk-tier scope, disabled-module fail-closed behavior, and seed/test coverage.
- Operational-efficiency notes explaining when isolated single lots are allowed, when baskets/batch rounds are preferred, expected overhead thresholds, reviewer rationale, and privacy small-cell risk.
- Donor-of-record and donation-recipient-constraint notes explaining participant recipient choice, funder accepted recipient scope, incompatible-funding release/exclusion, tax-receipt disclosures, restricted-fund handling, and charitable-donation provider limitations.
- Standing microfund review-mode notes explaining auto-lock, preview-then-lock, manual approval, notice windows, allocation cancellation, concurrent budget protection, and user-facing status labels.
- Progressive-disclosure UX notes explaining simple default labels, expandable mechanism details, receipt/audit drill-downs, and ordinary-user versus admin/debug state display.
- Envelope-scoped settlement notes explaining PurchaseEnvelopeRegistry, FundingSourceCommitment, ParticipantActionCommitment, FundingSettlementLineItem, envelope-specific settlement hashes, generic line-item reconciliation, and compatibility views for round/pledge/sponsor dashboards.
- Anonymous participant-supply matching notes explaining why public lots and baskets default to anonymous supply, when participant-specific disclosure is allowed, how pre-acceptance and post-funding invitation differ, and how replacement/decline/expiry are handled without exposing private reasons.
- Proportional verification-burden notes explaining how evidence requirements are calibrated to action risk, payout/donation value, gaming risk, privacy exposure, and operational efficiency.
- Donation-recipient due-diligence freshness notes explaining approval expiry, payment-destination re-verification, sanctions/AML freshness, effectiveness-evaluation references, fallback/cancellation behavior before action, and shortfall/fallback behavior after a verified action.
- Staged rollout notes explaining the intended capability ladder from simulated adjusted-impact rounds through production-gated rounds, lots, baskets, standing-pool authorizations, and only later legally reviewed wallet/stored-balance support.
- Intent-based information-architecture notes explaining the ordinary-user entry points, public copy rules, canonical envelope state labels, and the prohibition on exposing internal architecture names in ordinary UX.
- Brief final summary of what changed, how to run it locally, and any remaining integration gaps such as real payment-provider setup.
