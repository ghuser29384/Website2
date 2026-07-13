# Codex Implementation Spec: Consent-Gated Background Delegate for Moral Trade

## Source priorities

Prioritize the Forethought background-networking design sketch and Moral Trade’s current public Background Networking contracts:

- Forethought: [Design sketches: defense-favoured coordination tech — Background networking](https://www.forethought.org/research/design-sketches-defense-favoured-coordination-tech#background-networking)
- Moral Trade: [Background networking](https://www.moraltrade.org/background-networking)
- Moral Trade: [Match signal contract](https://www.moraltrade.org/api/moral-trade/match-signal/contract)
- Moral Trade: [Private overlap contract](https://www.moraltrade.org/api/moral-trade/private-overlap/contract)

## Revision 20 improvements

This revision keeps the core mechanism from `bg networking19.md` but tightens four remaining failure modes with high expected value and low downside:

- Preserve revision 19’s explicit **delegate authorization**, default cohort/matchmaker scoping, Moral Trade factor-code compatibility, prohibited-coordination blockers, and provenance/prompt-injection tests.
- Add **stale-brief invalidation**: opportunity briefs must snapshot the authorization, profile version, source-summary dependencies, candidate discoverability state, and expiry window; stale briefs lose all actions until recomputed.
- Add **probe-resistant helper runs**: delegate runs must enforce a minimum eligible-pool floor, dedupe repeated candidate exposure, bucket all visible counts, and block profile/query variants that would turn the system into an enumeration oracle.
- Add **uncertainty gating**: unconfirmed interview outputs or source-derived uncertainty flags may explain missing context, but may not add positive matching weight until explicitly confirmed by the participant.
- Add **participant-visible redacted delegate receipts** for runs, stale transitions, opportunity creation, and intro-request creation, without storing raw source text, exact wishes, exact candidate identity, private cohort membership, or message content in telemetry.

## Revision 21 improvements

This revision adds one high-confidence privacy improvement: an explicit **artifact retention and minimization lifecycle** for delegate runs, opportunity briefs, feedback, intro requests, and delegate receipts.

Rationale: background networking necessarily creates sensitive relational artifacts even when the visible brief is redacted. The mechanism should therefore keep actionable artifacts only while they are needed, then delete or anonymize candidate references, free-text feedback, source-summary dependencies, and linkable receipt data while preserving only redacted/anonymized safety audit rows where policy requires them.

## Revision 22 improvements

This revision adds one high-confidence consent improvement: an explicit **candidate-side exposure gate** for delegate-mediated discovery.

Rationale: background networking is not safe merely because the requester authorizes a delegate to search. The candidate whose broad profile may be surfaced also needs current, explicit exposure settings. A candidate profile may be scored or surfaced only if the candidate's profile is active, not paused or deleted, and its current discoverability / inbound-delegate settings authorize this delegate's audience scope, cohort, and allowed surfaces. This makes the semi-private wish registry two-sided: requester authorization controls what the delegate may look for, while candidate exposure consent controls what the delegate may use or surface.

## Revision 23 improvements

This revision adds one high-confidence implementation correction: **active-only linkable candidate and counterparty identifiers**.

Rationale: revision 21 requires linkable candidate references to be deleted or anonymized after the relevant review and safety windows, but the revision 22 data model still marked `candidate_profile_id`, `candidate_key_hash`, and `counterparty_profile_id` as non-nullable linkable references. That creates an implementation contradiction. Linkable identifiers and stable hashes must therefore be nullable and permitted only while the artifact is in an active consent/review state. Once an artifact is redacted or anonymized, the implementation must clear direct candidate/counterparty UUIDs and any stable cross-artifact candidate hashes, preserving only non-linkable aggregate/redacted audit metadata.


## Revision 24 improvements

This revision adds one high-confidence consent/minimization improvement: **default-off, separately confirmed candidate exposure settings**.

Rationale: revision 22 made candidate-side exposure consent mandatory, but a safe implementation should not infer inbound delegate discovery merely from a user's general profile discoverability. Semi-private registry visibility and delegate-mediated background surfacing are distinct privacy decisions. New, imported, reactivated, or migrated profiles must therefore default to `inbound_delegate_discovery = off` and no inbound delegate surfaces until the candidate explicitly confirms exposure for a named audience scope, cohort, and broad-preview surface set.

## Revision 25 improvements

This revision adds one high-confidence filtering improvement: **purpose-bound delegate mandates and purpose-compatible candidate exposure**.

Rationale: Forethought treats background networking as a system of personalized helpers, but says the central unresolved challenge is preventing sensitive desire data from becoming surveillance, exploitation, or collusion infrastructure. Scope and surface controls are necessary but not sufficient: a delegate authorized to search a cohort for “anything useful” is too broad. Every delegate run should therefore be tied to an explicit, participant-approved purpose category, and candidates should be surfaced only for purpose categories they separately allow. This makes the filtering system use-specific rather than merely audience-specific.

## Revision 26 improvements

This revision adds one high-confidence implementation correction: **single-purpose delegate runs and inherited purpose codes**.

Rationale: revision 25 made delegate authorizations purpose-bound, but an authorization may contain multiple allowed purpose codes. If one helper run can combine several purposes, the implementation could reintroduce broad “general networking” behavior through purpose bundling. Each delegate run must therefore carry exactly one allowlisted purpose code, and each opportunity brief and intro request must inherit that same code without free-form override. If a participant authorizes multiple purposes, the system must enqueue separate runs with separate receipts, stale-state checks, anti-probing budgets, and candidate-exposure checks for each purpose.

## Revision 27 improvements

This revision adds one high-confidence consent-governance correction: **versioned purpose-code registry and no semantic reinterpretation of prior consent**.

Rationale: revision 26 made each delegate run single-purpose, but the safety value of purpose limits depends on stable purpose semantics. A future implementation must not broaden an existing purpose label, reuse a deprecated code, or silently reinterpret old authorizations and candidate-exposure confirmations. Purpose codes must therefore come from a versioned registry with immutable meanings; any material purpose-policy change requires a new code or explicit re-confirmation, and dependent runs, briefs, receipts, and intro requests must snapshot the registry version used.

## Revision 28 improvements

This revision adds one high-confidence implementation correction: an explicit **purpose-code registry artifact and change-control gate**.

Rationale: revision 27 requires versioned, immutable purpose semantics, but without a concrete registry artifact the implementation could still enforce purpose codes through scattered constants, docs, or UI copy that drift over time. The purpose-code registry must therefore be represented as a first-class governed artifact, preferably as a table or typed configuration bundle with tests, so every authorization, candidate exposure confirmation, delegate run, opportunity brief, receipt, and intro request can validate against the same immutable purpose-code/version record.

## Revision 29 improvements

This revision adds one high-confidence rollout-safety improvement: a **time-bounded adversarial risk-review gate before any non-staff or external pilot use**.

Rationale: Forethought identifies privacy, surveillance, exploitation, and collusion as the central hard tradeoff for background networking. The mechanism already has feature flags, purpose scoping, candidate exposure consent, anti-probing controls, and retention rules; however, those controls need an explicit pre-pilot review artifact so each enabled purpose/surface/cohort combination is adversarially checked before real users outside internal/staff testing are exposed. Non-staff delegate runs must therefore fail closed unless a current approved risk review covers the exact purpose code, purpose-policy version, surfaces, audience/cohort scope, notification path, retention policy, LLM data-handling mode, abuse cases, rollback plan, and kill-switch owner.

## Revision 30 improvements

This revision adds one high-confidence privacy and auditability improvement: **explicit-field-only matching and no latent private profile vectors**.

Rationale: Forethought's background-networking sketch allows LLM-driven synthesis of hopes, intent, and capabilities, but the same sketch identifies privacy, surveillance, exploitation, and collusion as the central hard tradeoff. A system can satisfy “no raw source text” while still creating opaque private embeddings or latent profiles that are hard for participants to inspect, revoke, or audit. Matching inputs must therefore be limited to participant-visible, schema-bound, explicitly confirmed broad fields and tags. Hidden embeddings, latent preference vectors, unreviewed model summaries, or uninspectable derived features must not influence eligibility, scoring, anti-probing, notifications, opportunity briefs, or intro requests.

## Revision 31 improvements

This revision adds one high-confidence operator-safety correction: **non-waivable hard gates and admin/break-glass limits**.

Rationale: the mechanism now relies on operator review, risk reviews, purpose registries, and rollout gates. Those controls would be undermined if an admin or reviewer could manually override candidate exposure consent, requester authorization, purpose-policy versions, anti-probing floors, retention/anonymization states, or explicit-field-only matching. Operator actions may therefore only narrow, suppress, quarantine, mark stale, reject, or approve a next step after all hard gates pass. Break-glass actions are limited to abuse prevention and system containment; they must not widen discovery, create consent, surface candidates, unredact data, disclose contact details, or make stale artifacts actionable.

## Revision 32 improvements

This revision adds one high-confidence incident-containment improvement: **scoped emergency stop controls for background networking**.

Rationale: revision 31 makes operator and break-glass actions non-waiver safety actions, but incident response still needs a first-class way to stop matching quickly when a privacy, collusion, exploitation, notification, prompt-injection, or retention failure is suspected. A safe implementation must support global, purpose-code, purpose-policy-version, surface, cohort, and audience-scope emergency stops that cancel pending runs, suppress notifications, block candidate surfacing and intro advancement, and mark dependent active briefs stale or paused until the stop is released through a documented safety action.

## Revision 33 improvements

This revision adds one high-confidence implementation clarification: **proposal-only source-summary derived tags and no ambiguous `derived_broad_tags` match input**.

Rationale: revision 30 requires explicit-field-only matching, but the source-summary table still contained a `derived_broad_tags` field alongside `confirmed_broad_tags` and `unconfirmed_derived_tags`. That creates an avoidable implementation ambiguity: a developer could treat “derived” tags as approved match inputs even though they were only machine/user-source proposals. The model should therefore use `unconfirmed_derived_tags` for proposal-only tags and `confirmed_broad_tags` for match inputs. If an existing schema already has `derived_broad_tags`, it must be treated as a legacy proposal-only alias, migrated when possible, and invariant-tested so it cannot influence eligibility, scoring, surfacing, notifications, opportunity briefs, or intro requests.

## Revision 34 improvements

This revision adds one high-confidence implementation correction: **per-purpose policy-version bindings for multi-purpose consent**.

Rationale: revisions 25–28 make purpose codes central to consent and filtering, but an authorization or candidate-exposure setting may contain multiple purpose codes while the data model used a single `purpose_policy_version` field. Because purpose-policy versions are attached to individual purpose-code registry entries, a single version field is ambiguous and could cause one purpose's consent to be misapplied to another. Multi-purpose authorizations and candidate exposure settings must therefore store explicit `{purpose_code, purpose_policy_version}` bindings for each approved purpose, and each single-purpose run must select exactly one bound pair.


## Revision 35 improvements

This revision adds one high-confidence operational-safety improvement: **runtime safety tripwires with automatic scoped fail-closed pausing**.

Rationale: revision 32 adds emergency stop controls and revision 29 adds pre-pilot adversarial risk reviews, but a background networking system also needs continuous runtime detection for known failure modes. If the system observes a non-waivable gate failure, unsafe notification attempt, candidate-facing exposure from a scan/brief, latent-vector matching attempt, RLS/encryption failure, expired risk-review use, retention cleanup failure, or sustained anti-probing/report anomaly, it should not wait for a manual audit. Blocking tripwires must automatically activate the narrowest applicable emergency control or pause the affected lane, using only redacted aggregate signals and preserving participant revocation paths.

## Revision 36 improvements

This revision adds one high-confidence resilience improvement: **tripwire signal-trust classes and anti-denial-of-service limits**.

Rationale: revision 35 makes runtime tripwires fail closed for known safety failures, but tripwires themselves can be abused if user-controllable aggregate signals, such as report spikes or mass dismissals, can automatically disable a broad purpose, cohort, or global lane. Tripwire inputs must therefore be classified by trust level. Direct platform invariant failures may still fail closed automatically, but user-controllable aggregate signals may trigger review, narrow throttles, or the smallest affected-lane pause only unless corroborated by trusted system signals or operator-confirmed evidence. This preserves safety while reducing the risk that the safety layer becomes an attack surface.

## Revision 37 improvements

This revision adds one high-confidence consent-boundary clarification: **source-summary approval is separate from broad-tag confirmation**.

Rationale: revisions 30 and 33 require explicit-field-only matching and proposal-only derived tags, but an implementation could still treat “approving” a source summary as implicitly approving all proposed tags from that summary. Source-summary approval should only make the summary eligible for review and retention under the participant's allowed-field policy. A tag or field becomes matchable only after the participant explicitly confirms that specific broad tag or field. Bulk confirmation is allowed only when every confirmed tag is displayed and logged as a separate confirmation record. Revoking tag confirmation must remove future matching influence and mark dependent active briefs stale.

## Revision 38 improvements

This revision adds one high-confidence privacy and consent improvement: **third-party data minimization and no third-party inferred wishes**.

Rationale: source summaries, exports, public URLs, emails, calendar-derived notes, or manual notes can contain information about people who are not the participant. Background networking must not turn a participant's possession of third-party text into permission to profile, surface, or match on another person's wishes, constraints, contact details, affiliations, vulnerabilities, capabilities, or strategy. Source summaries may create participant-visible proposals only about the participant's own wishes/offers/capabilities or non-sensitive public context. Any private third-party information must be redacted, ignored for matching, or routed through that person's own independently confirmed profile and candidate-exposure settings before it can affect discovery.

## Revision 39 improvements

This revision adds one high-confidence retention-safety improvement: **time-bounded retention holds with minimum-necessary scope**.

Rationale: earlier revisions allow safety-review, abuse-prevention, or legal holds to delay deletion/anonymization. Without explicit scope, expiry, owner, review cadence, and field-minimization rules, those holds could become long-lived linkable relational records and recreate the surveillance risk the mechanism is designed to avoid. Retention holds must therefore be separate governed artifacts: they may pause cleanup only for the minimum necessary records and fields, must be reason-coded, owner-assigned, time-bounded, reviewed, and released into cleanup. A hold must never make stale, closed, expired, redacted, or anonymized artifacts actionable again.


## Revision 40 improvements

This revision adds one high-confidence minimization correction: **do not reward profile completeness or oversharing in matching**.

Rationale: the mechanism's score function previously gave positive weight to `profileCompleteness01`. That creates an avoidable incentive for users to disclose more information than is needed, and it could disadvantage privacy-minimal profiles even when they contain enough confirmed broad signals for a safe match. Matching should instead reward only the sufficiency of explicitly confirmed, broad, purpose-compatible signals needed for the current run. More private detail, more source summaries, more free text, more confirmed tags, or more retained history must not increase score once sufficiency is reached.

## Revision 41 improvements

This revision adds one high-confidence candidate-safety improvement: **candidate-side exposure and intro-burden budgets**.

Rationale: candidate exposure consent says whether a profile may be surfaced, but it should also say how often and in what volume it may be surfaced. Without aggregate candidate-side budgets, a consenting candidate could be repeatedly surfaced to many requesters or accumulate many pending intro requests, creating harassment, attention burden, or exploitability even when each individual requester passed its own rate limits. Candidate exposure settings must therefore include per-purpose/per-scope surfacing budgets, pending-intro limits, and cool-off controls. Exceeding those limits is a hard blocker until the window resets or the candidate explicitly widens the budget.

## Revision 42 improvements

This revision adds one high-confidence implementation-safety correction: **atomic, retention-bound candidate exposure counters**.

Rationale: revision 41 adds candidate-side surfacing budgets, but budgets are only reliable if enforcement is atomic and if counter rows do not become permanent linkable exposure histories. Concurrent helper runs must not be able to overshoot a candidate's budget through race conditions, and budget counters must expire, anonymize, or aggregate after the relevant window and safety/legal holds. Candidate exposure counters therefore need active-only candidate identifiers, retention fields, and transactional check-and-increment or short-lived reservation semantics.

## Revision 43 improvements

This revision adds one high-confidence implementability and safety correction: **separate automated redacted brief creation from human-reviewed disclosure/contact state changes**.

Rationale: earlier revisions required human review before “state changes,” which could be read to require manual review before every internal redacted opportunity brief, redacted receipt, stale transition, counter reservation, or retention cleanup. That conflicts with the core background-delegate loop: Forethought's mechanism relies on helpers operating in the background and notifying principals when promising connections are found. Human/operator review should therefore be mandatory before disclosure, contact, reliance, counterparty-facing notification, intro-review approval, or any non-redacted/counterparty-affecting state change. Internal deterministic creation of redacted, participant-owned artifacts may be automated only after all non-waivable gates pass, and those artifacts must remain non-disclosing and non-actionable for contact or reliance until the required review/consent stage.

## Revision 44 improvements

This revision adds one high-confidence anti-enumeration and privacy correction: **requester-visible blocker redaction for candidate-specific gates**.

Rationale: candidate-side consent, budget, cohort, cool-off, opt-out, retention, and privacy-stage gates are necessary, but their exact outcomes are themselves sensitive. If a requester can see that a specific candidate was blocked because of budget exhaustion, opt-out, cohort mismatch, or privacy settings, the blocker label can become an enumeration oracle even when exact identity is hidden. Candidate-specific blocker reasons must therefore remain internal and be mapped to generic requester-facing categories such as privacy/consent gate, availability/budget gate, safe-pool withheld, or review required. Candidates may see their own coarse budget/exposure state, but not requester identities or sparse counts.

## Revision 45 improvements

This revision adds one high-confidence anti-enumeration correction: **bucketed or withheld requester-visible blocker and factor aggregates**.

Rationale: revision 44 redacts candidate-specific blocker labels, but exact counts of generic blocker categories can still leak sensitive candidate-specific facts when the requester can vary cohorts, purposes, searches, or profile fields. Requester-facing briefs, receipts, diagnostics, APIs, telemetry, and docs must therefore bucket, suppress, or aggregate any factor/blocker counts that could be traced to candidate-specific consent, budget, cohort, privacy-stage, retention, prior-dismissal/report, or third-party-data gates. Internal exact counts may exist only in service-side safety tables under retention and RLS; they must not become requester-visible.

## Revision 46 improvements

This revision adds one high-confidence telemetry/privacy correction: **candidate-budget state is candidate-owned or internal-only, not requester/export-visible**.

Rationale: revision 45 coarsens requester-visible blocker and factor aggregates, but `candidate budget-state label` remained an allowed telemetry field. If labels such as `clear`, `near_limit`, `exhausted`, or `cooloff` appear in requester-visible receipts, exportable analytics, public reports, diagnostics, or client telemetry tied to a sparse pool, they can still leak candidate-specific exposure or burden state. Candidate budget-state labels must therefore be candidate-owned or internal service/safety data only. Requester-visible, exportable, or public surfaces may use only generic availability/budget categories that are bucketed, withheld, or aggregated over a sufficiently broad safe pool.

## Revision 47 improvements

This revision adds one high-confidence anti-enumeration correction: **side-channel-safe no-result, timing, and digest behavior**.

Rationale: revisions 44–46 protect requester-visible labels and aggregates, but a requester could still probe the registry by varying a profile, cohort, purpose, or manual scan and observing immediate no-result responses, receipt timing, digest changes, queue timing, notification absence, or count deltas. No-result and withheld states are therefore treated as requester-visible outputs. They must be generic, rate-limited, and delivered through fixed digest windows or jittered timing; exact internal reasons and exact timing/delta signals may exist only in service-side safety tables under RLS, retention limits, and redacted audit policy.

## Revision 48 improvements

This revision adds one high-confidence privacy and implementation clarification: **internal-only candidate-dependency snapshots and generic stale/dependency labels**.

Rationale: prior revisions require opportunity briefs to snapshot candidate exposure, discoverability, opt-in, budget, cohort, and dependency state so stale checks can be correct. But those snapshot fields are themselves candidate-specific private data. If exposed through requester-facing APIs, receipts, stale reasons, exports, or diagnostics, they could reveal whether a candidate exists, opted out, changed privacy settings, hit a budget, left a cohort, or was withheld for another private reason. Candidate-dependency snapshots must therefore be service-side/internal-only fields used for revalidation and retention, while requester-visible surfaces receive only generic dependency labels and generic stale/recompute reasons.

## Revision 49 improvements

This revision adds one high-confidence implementation-safety correction: **sanitized participant-facing projections instead of direct reads from internal brief tables**.

Rationale: revision 48 makes candidate-dependency snapshots internal-only, but a table that is merely participant-scoped by RLS can still leak internal columns if ordinary authenticated routes or client queries read the owned row directly. Row-level ownership is not enough when the row contains active candidate identifiers, candidate-dependency snapshots, exact blocker state, or timing-sensitive fields. Requester-facing APIs and UI must therefore read from a sanitized view/DTO that physically excludes internal-only columns, while internal brief tables and candidate-specific columns remain service-role/operator-only or protected by column-level grants.

## Revision 50 improvements

This revision adds one high-confidence implementation-safety correction: **versioned allowlist response schemas with extra-key rejection for requester-facing surfaces**.

Rationale: revision 49 requires sanitized projections/DTOs, but sanitized DTOs can drift over time if developers reuse internal types, spread ORM entities, add debug fields, or let generated serializers include newly added internal columns. Requester-facing opportunity brief, receipt, diagnostic, export, telemetry, cache, and UI payloads must therefore be produced through versioned explicit allowlist schemas that reject unknown fields, snapshot the exact public key set, and fail tests whenever an internal-only field could be serialized.

## Exact best concrete mechanism

Build a **Consent-Gated Background Delegate that creates privacy-safe opportunity briefs**.

Credence in this as the right first mechanism for Moral Trade: **0.76**.

Do **not** make live private-feed scraping, autonomous outreach, or production private-set-intersection the first build. Forethought’s background-networking section describes a “matchmaking marketplace” of attentive personalized helpers that look for promising connections and notify principals, with passive source access and proactive wish injection as possible inputs. It also flags privacy, surveillance, harassment, exploitation, and collusion as central design risks.

Moral Trade’s current public implementation already emphasizes broad previews first, consent before detail, no autonomous outreach, deterministic matching, no private-feed mining, minimal telemetry, anti-enumeration budgets, and default-off higher-power lanes.

The exact mechanism is:

> **A user-approved delegate profile + reviewed source summaries + deterministic broad-preview matching + generic opportunity briefs + mutual-consent intro requests.**

## Operational flow

1. A participant opts into Background Networking.
2. The participant creates an explicit **delegate authorization** that states what broad coordination purpose the helper may serve, what surfaces it may use, where it may search, how often it may run, how many briefs it may create, the minimum confidence band, and when the authorization expires.
3. The participant creates a **structured wish profile** through explicit fields and, where enabled, a fluent but schema-bound interview.
4. The participant may add **manual or imported source summaries**, but raw feeds are not continuously searched, stored in analytics, or used directly for matching.
5. The system converts only user-approved wishes and source summaries into **broad matching signals**:
   - cause areas
   - offers
   - asks
   - capabilities
   - constraints
   - verification preferences
   - coarse availability
   - privacy stage
   - exclusions
6. A background helper job periodically searches the wish registry using only those broad signals and only inside the participant-approved authorization scope. Each helper run must select exactly one allowlisted purpose code from the active authorization and the current versioned purpose-code registry; multiple authorized purposes require separate runs, receipts, stale-state checks, and anti-probing budgets. By default, that scope should be a specific cohort, pilot pack, partner-approved audience, or existing matchmaker workflow rather than the whole registry.
7. Before scoring, the helper applies an anti-probing floor: the authorized search pool must be broad enough, repeated candidate exposure must be deduped, and visible count outputs must be bucketed rather than exact.
8. Before scoring or surfacing any candidate, the helper applies a candidate-side exposure gate: the candidate profile must be active, not paused or deleted, and its current, separately confirmed inbound-delegate settings must authorize this delegate's purpose category, audience scope, cohort, and allowed surfaces. General broad-profile discoverability alone must never be treated as consent to delegate-mediated background surfacing.
9. Before scoring or surfacing any candidate, the helper also applies candidate-side burden controls: the candidate's per-purpose/per-scope surfacing budget, pending-intro limit, and cool-off state must permit another surface or intro path. Exhausted budgets block surfacing until the window resets or the candidate explicitly widens the budget.
10. If it finds a high-confidence broad match that passes privacy, safety, anti-enumeration, anti-collusion, purpose-compatibility, cohort-scope, candidate-exposure, dependency-validity, and uncertainty-gating checks, it creates an **opportunity brief** with:
   - reason codes
   - confidence band
   - visible redactions
   - blockers
   - source/provenance surfaces
   - requester-safe dependency labels
   - internal-only candidate exposure/dependency snapshots for server revalidation
   - a sanitized participant-facing projection or DTO that excludes internal-only columns
   - a versioned requester-facing output-schema allowlist that rejects extra keys
   - redacted delegate receipt id
   - next-step options
11. Operator or admin review may add blockers, mark the brief stale, quarantine the artifact, or approve a next step only after all hard gates pass. No operator, admin, reviewer, feature flag, or break-glass path may waive requester authorization, candidate exposure consent, purpose-policy compatibility, risk-review coverage, anti-probing controls, retention/anonymization state, or explicit-field-only matching.
12. Before notification, display, feedback advancement, or intro-request creation, the system checks scoped emergency stop controls. Any active applicable stop blocks the action, cancels or pauses pending runs, suppresses notifications, and marks dependent active briefs stale or emergency-paused until explicitly released through a redacted safety action.
13. Notifications are generic. They never include exact wishes, source notes, contact details, private constraints, or counterparty-specific sensitive content.
14. No-result, withheld, low-confidence, or blocked-run states are also generic. Requester-visible no-result responses, digest changes, receipt timing, queue timing, and notification absence must not reveal whether a candidate exists or was filtered by a candidate-specific gate; use fixed digest windows, jitter, rate limits, and generic “no privacy-safe opportunity surfaced” language.
15. The participant can dismiss, defer, report, or request an introduction.
16. Every display or action revalidates the brief’s dependency snapshot; if an authorization, profile scope, source summary, candidate exposure setting, candidate discoverability state, cohort boundary, emergency-stop state, or expiry window has changed, the brief becomes stale and cannot advance to an intro request.
17. Stale, closed, dismissed, reported, or expired artifacts enter a retention lifecycle: after the participant-visible review window and any safety-review hold, candidate references and free-text content are deleted or anonymized, while only redacted/anonymized audit rows may remain.
18. Only after mutual consent and operator review can field-level grants disclose more detail.

This matches Forethought’s “helpers in the background + wish profiling + semi-private registry” design while preserving Moral Trade’s safety posture. The default adoption path is niche/community-first, not a global unscoped matching graph.

---

# Instruction for Codex GPT-5.5-xHigh

You are Codex GPT-5.5-xHigh working in the Moral Trade repository.

## Goal

Build the exact best concrete Background Networking mechanism for Moral Trade: a **Consent-Gated Background Delegate** that turns user-approved wish profiles and reviewed source summaries into privacy-safe opportunity briefs, then routes interested users into mutual-consent, operator-reviewed introductions.

This is **not**:

- a scraping feature
- an autonomous outreach feature
- an engagement recommender
- a global moral-ranking system
- a production private-overlap cryptography feature

## Core mechanism

Implement a background delegate loop with this invariant-preserving flow:

1. Participant opts into Background Networking.
2. Participant grants a time-bounded delegate authorization covering allowed purpose codes, allowed surfaces, audience/cohort scope, run budget, maximum briefs, minimum confidence band, and revocation controls.
3. Participant creates or updates a structured wish profile through explicit fields and, where enabled, a schema-bound fluent interview.
4. Participant may add a manual or imported source summary. Raw private feeds must not be continuously ingested, searched, copied into analytics, or used directly for matching.
5. Only participant-approved broad signals become match inputs. Hidden embeddings, latent preference vectors, unreviewed model summaries, and uninspectable derived features must not influence matching or surfacing.
6. A deterministic background helper run searches broad wish-registry previews and approved broad profile signals within the active authorization scope, under exactly one allowlisted purpose code selected from the active authorization.
7. The helper run enforces a minimum eligible-pool floor, repeated-candidate dedupe, count bucketing, and query/profile-variant anti-probing controls before scoring candidates.
8. Before scoring or surfacing any candidate, the helper run enforces candidate-side exposure consent: the candidate profile must be active and its current, separately confirmed inbound-delegate settings must authorize this delegate's purpose category, audience scope, cohort, and allowed surfaces. General broad-profile discoverability alone must not authorize delegate-mediated discovery.
9. Before scoring or surfacing any candidate, the helper run enforces candidate-side burden controls: the candidate's current per-purpose/per-scope surfacing budget, pending-intro limit, and cool-off state must permit another exposure or intro path. Exhausted or missing required budgets are hard blockers.
10. If a candidate match passes eligibility, safety, anti-collusion, anti-enumeration, purpose-compatibility, cohort-scope, candidate-exposure, dependency-validity, uncertainty-gating, and threshold checks, create a privacy-safe opportunity brief with redacted requester-facing dependency labels, internal-only candidate exposure/dependency snapshots for server revalidation, a sanitized participant-facing projection/DTO, a versioned requester-facing output-schema allowlist that rejects extra keys, and a participant-visible receipt.
11. Apply non-waivable hard-gate enforcement before any notification, feedback advancement, or intro flow. Operator/admin actions may only narrow, suppress, quarantine, mark stale, reject, or approve a next step after all hard gates pass; they must not override consent, purpose, risk-review, anti-probing, retention, or explicit-signal requirements.
12. Apply scoped emergency stop controls before notification, display, feedback advancement, intro-request creation, candidate-facing exposure, or any new delegate run. An active applicable stop blocks the action and must fail closed.
13. Notify the participant with generic copy only.
14. Return or display generic no-result, withheld, low-confidence, and blocked-run states only on a side-channel-safe cadence. Do not expose immediate no-match reasons, receipt/queue timing, notification absence, or digest-count deltas that distinguish candidate absence from candidate opt-out, budget exhaustion, cool-off, cohort mismatch, privacy-stage conflict, retention state, or another candidate-specific gate.
15. Participant can dismiss, defer, report, or request an intro.
16. Before display or feedback, revalidate the brief’s authorization, profile, source-summary, cohort, candidate-exposure, candidate-discoverability, emergency-stop state, and expiry dependencies; stale briefs must not be actionable.
17. When a run, brief, feedback item, receipt, or intro request becomes closed, stale, expired, dismissed, reported, or deleted, apply its retention policy: purge or anonymize linkable candidate references and free-text content after the review window, preserving only redacted/anonymized safety audit rows where policy permits.
18. Intro requests remain operator-reviewed and mutual-consent gated before any exact wishes, contact details, sensitive constraints, source notes, or private counterparties are disclosed.

Use or extend existing Background Networking tables, routes, validators, and tests if present. Do not fork the domain model unnecessarily.

## Hard invariants

- Broad previews before exact private details.
- Exact details move only through field-level, purpose-bound privacy grants.
- No autonomous outreach.
- No raw private-feed ingestion for matching.
- No raw source text in analytics, logs, notifications, or public reports.
- No hidden ML ranking of people.
- No latent private profile vectors or embedding-based matching. Eligibility, scoring, anti-probing, notifications, opportunity briefs, and intro requests may use only schema-bound, participant-visible, explicitly confirmed broad fields and tags.
- Matching must not reward oversharing or raw profile completeness. Additional private detail, source-summary volume, free text, confirmed tag count, retained history, or source variety must not increase eligibility or score once the minimum explicitly confirmed broad signals for the selected purpose are sufficient. Scoring may use `confirmedSignalSufficiency01` only as a capped sufficiency check for the current purpose, never as a completeness, engagement, richness, or disclosure-volume reward.
- Source-summary derived tags are proposal-only until explicitly confirmed. There must be no separate ambiguous `derived_broad_tags` matching input; if an existing schema already has `derived_broad_tags`, treat it as a legacy alias for `unconfirmed_derived_tags`, migrate it where feasible, and never use it for eligibility, scoring, surfacing, notifications, opportunity briefs, or intro requests.
- Source-summary approval and broad-tag confirmation are separate consent gates. Setting a source summary to `approved` must not by itself make any proposed tag, proposed field, summary-derived category, or allowed-field key usable for matching. A source-summary-derived tag may influence eligibility, scoring, surfacing, notifications, opportunity briefs, feedback advancement, or intro requests only if it is in `confirmed_broad_tags` and has an explicit participant confirmation record for the current source-summary version and allowed-field policy. Bulk confirmation must display every tag being confirmed; revoking a tag confirmation removes future matching influence and marks dependent active briefs stale.
- Third-party data in source summaries, exports, public URLs, manual notes, email/calendar excerpts, or chatbot history must not become a hidden profile of someone who is not the participant. Private third-party identifiers, contact details, wishes, constraints, capabilities, vulnerabilities, affiliations, or strategy must be redacted or ignored for matching unless that person independently participates and confirms the relevant profile/exposure fields through their own account. A participant may confirm broad tags only about their own wishes/offers/capabilities or non-sensitive public context; third-party-derived tags are hard blockers for eligibility, scoring, surfacing, notifications, opportunity briefs, feedback advancement, and intro requests.
- No global moral ranking.
- No inferred ideology, psychology, protected traits, hidden preferences, or exact private wishes.
- Human review before disclosure, contact, reliance, counterparty-facing notification, intro-review approval, or any non-redacted/counterparty-affecting state change. Internal deterministic creation of redacted opportunity briefs, redacted receipts, stale-state transitions, atomic budget reservations/counters, retention-cleanup actions, or other participant-owned internal artifacts may be automated only when all non-waivable hard gates pass; these internal artifacts must not disclose exact details, contact counterparties, create reliance obligations, or make external/counterparty-facing state changes before the required review and consent stage.
- Human/operator review is not a waiver mechanism. Operators, admins, reviewers, feature flags, and break-glass paths must not override requester authorization, candidate exposure consent, purpose-policy compatibility, risk-review coverage, anti-probing floors, stale-state checks, retention/anonymization state, explicit-signal-only matching, RLS, encryption, or notification restrictions. Manual actions may only narrow scope, add blockers, suppress/quarantine artifacts, mark artifacts stale, reject a request, or approve a next step after all hard gates pass.
- Sparse or overly specific searches are withheld or broadened.
- Delegate runs require an active, unexpired, participant-controlled authorization.
- Delegate runs are cohort-, pilot-, or matchmaker-scoped by default; global cross-registry scans require a separate explicit flag and operator approval.
- Delegate authorizations are purpose-bound. Every delegate run, opportunity brief, and intro request must cite an allowlisted purpose code such as `moral_trade_offer`, `donation_offset`, `pledge_swap`, `moral_public_good`, `research_collaboration`, or `community_intro`. Broad catch-all purposes such as `anything useful`, `general networking`, or unbounded opportunity discovery are not valid launch scopes.
- Delegate runs are single-purpose. Even if an authorization contains multiple allowed purpose codes, each run must choose exactly one purpose code; opportunity briefs, feedback advancement, receipts, and intro requests must inherit that exact code. The system must not merge, fallback across, or silently substitute purpose codes to increase match volume.
- Purpose-code meanings are versioned and immutable. Purpose codes must come from a maintained allowlist / registry with a `purpose_policy_version`; do not allow user-defined purpose codes, broad catch-all codes, or semantic broadening of an existing code. If a purpose category is materially changed, split, merged, deprecated, or broadened, existing delegate authorizations and candidate exposure settings must not be silently reinterpreted; they require explicit re-confirmation or become stale for that purpose.
- Multi-purpose consent must use per-purpose policy-version bindings. Any delegate authorization or candidate exposure setting that contains more than one purpose code must store explicit `{purpose_code, purpose_policy_version}` pairs for each code. A single `purpose_policy_version` field must not be treated as covering multiple purpose codes unless the purpose-code registry explicitly defines a single global policy version for those exact codes, and this spec assumes per-purpose bindings by default.
- The purpose-code registry is a governed artifact, not scattered UI copy. Each active purpose code must have one canonical registry record containing its version, label, allowed surfaces, prohibited uses, risk tier, and re-confirmation rule. Delegate authorization, candidate exposure, delegate-run, opportunity-brief, receipt, intro-request, documentation, and tests must all validate against this registry record; if the registry entry is deprecated, superseded, materially changed, or missing, affected runs and briefs must fail closed or become stale.
- Non-staff or external-pilot delegate runs require a current approved adversarial risk review for the exact purpose code, purpose-policy version, allowed surfaces, audience/cohort scope, notification path, retention policy, LLM data-handling mode, abuse-case analysis, rollback plan, and kill-switch owner. Internal/staff-only testing may run behind feature flags, but any use involving ordinary users, partner cohorts, public-broad-preview scope, or candidate-facing exposure must fail closed without this review.
- Scoped emergency stop controls are non-waivable. If an active emergency stop applies to the global system, purpose code, purpose-policy version, allowed surface, audience scope, cohort, notification path, LLM mode, or retention class, the system must cancel or pause pending runs, suppress notifications, block new candidate surfacing, block opportunity-brief creation, block feedback advancement, block intro-request creation, and mark dependent active artifacts stale or emergency-paused. Feature flags, operator/admin actions, fixtures, and break-glass paths must not bypass an active emergency stop; they may only activate, narrow, or release it through the documented safety-action process.
- Runtime safety tripwires are non-waivable for known invariant failures. Blocking tripwires must automatically fail closed and activate the narrowest applicable emergency control, or pause the affected purpose/surface/cohort lane, when they detect unsafe notification attempts, candidate-facing exposure before the intro-consent flow, latent-vector or embedding-based matching attempts, missing/expired risk-review use, RLS/encryption failures, retention/anonymization failures, repeated anti-probing threshold breaches, or a severe report/operator-overrule spike. Review-only anomaly tripwires may queue operator review, but they must not permit new surfacing if their configured severity is blocking. Tripwire inputs, logs, and summaries must use only redacted aggregate signals and must not expose exact wishes, source notes, candidate identities, prompts, message text, private cohort membership, or hidden abuse heuristics.
- Tripwire-triggered containment must be resistant to adversarial denial-of-service and capture. Signal sources must be classified at least as `trusted_invariant`, `platform_integrity`, `operator_confirmed`, `user_controllable_aggregate`, or `mixed`. Direct invariant failures and platform-integrity failures may automatically activate scoped emergency controls. User-controllable aggregate signals such as reports, dismissals, suspicious feedback, or mass low-quality reports must not by themselves trigger global stops, public-broad-preview stops, whole-purpose stops, whole-cohort stops, candidate exposure revocation, or broad deplatforming. Without corroboration from trusted system signals or operator-confirmed evidence, user-controllable aggregate signals may only queue review, apply rate-limited narrow cool-offs, suppress the specific suspect artifact, or pause the smallest affected lane. Any broader stop based partly on user-controllable signals must record the corroborating trusted signal or operator-confirmed basis, and must use the narrowest scope justified.
- Candidate-side exposure consent is mandatory. A candidate profile may be scored or surfaced only if the candidate's current profile is active, not paused or deleted, and its separately confirmed inbound-delegate settings authorize the requesting delegate's purpose code, audience scope, cohort, and allowed surfaces. General `discoverability_scope` is necessary but not sufficient; it must not by itself imply inbound delegate discovery. `owner_only`, `inbound_delegate_discovery = off`, purpose-mismatched, out-of-cohort, paused, deleted, revoked, expired, migrated-without-reconfirmation, or otherwise unconfirmed candidate exposure states are hard blockers.
- Candidate-side exposure is also budgeted. Non-`off` inbound delegate discovery must have explicit or repository-safe default per-purpose/per-scope surfacing budgets, pending-intro limits, and cool-off behavior. These budgets apply across requesters, delegate runs, and cohorts within the configured scope. Exhausted budgets, missing required budgets, or active candidate cool-offs are hard blockers before scoring, surfacing, opportunity-brief creation, feedback advancement, candidate-facing exposure, or intro-request creation. Candidates may narrow or pause budgets immediately; widening budgets requires explicit confirmation and updates the candidate exposure/budget version. Operators may suppress or narrow budget state but must not override an exhausted candidate budget to create exposure.
- Candidate-side budget enforcement must be atomic, idempotent, and retention-bound. The system must reserve or increment candidate exposure counters in the same transactional boundary as surfacing or intro advancement, or use short-lived reservations that expire and release automatically. Concurrent delegate runs, retries, queue workers, or duplicate requests must not allow a candidate to exceed the confirmed budget. Counter rows must use active-only candidate identifiers and be deleted, anonymized, or aggregated after their window and any valid safety/legal hold.
- Requester-visible outputs must not reveal candidate-specific gate outcomes. Internal blocker reasons such as candidate opt-out, candidate exposure mismatch, budget exhaustion, cool-off, prior dismissal/report, cohort mismatch, privacy-stage conflict, retention/anonymization state, or third-party-data block must be mapped to generic requester-facing categories such as `privacy_or_consent_gate`, `availability_or_budget_gate`, `safe_pool_withheld`, `stale_or_unavailable`, or `review_required`. Opportunity briefs, notifications, receipts, API responses, manual-scan diagnostics, telemetry, and public docs shown to a requester must not let the requester infer whether a particular candidate exists, opted out, hit a budget, is in a cohort, or was withheld for a specific private reason. Candidates may see only their own coarse budget/exposure status and must not see requester identities, exact sparse counts, or probing signals before the relevant consent stage.
- Requester-visible blocker, factor, and diagnostic aggregates must also be probe-resistant. Counts tied to candidate-specific gates, including genericized categories, must be bucketed, suppressed, or aggregated over a sufficiently broad safe pool before display. Do not expose exact per-category counts, deltas, sequence changes, candidate budget-state labels, or receipt/telemetry aggregates that let a requester infer how many candidates were withheld for opt-out, budget, cool-off, cohort, privacy-stage, retention, prior-dismissal/report, third-party-data, or similar private reasons. Candidate budget-state labels such as `clear`, `near_limit`, `exhausted`, or `cooloff` are candidate-owned or internal service/safety data only; requester-visible, exportable, or public surfaces may use only generic availability/budget categories that are bucketed, withheld, or aggregated over a sufficiently broad safe pool. Internal exact counts and budget-state labels may be retained only in service-side safety/quota tables under RLS, retention limits, and redacted audit policy.
- No-result and timing side channels are requester-visible outputs. No-match, low-confidence, withheld, blocked, stale, or “nothing new” states must not reveal whether a candidate exists or which candidate-specific gate applied. Do not expose immediate no-result reasons, exact run completion timing, queue-state transitions, notification absence, digest-count deltas, receipt sequence changes, retry timing, or manual-scan diagnostics that let a requester distinguish candidate absence from candidate opt-out, exposure mismatch, budget exhaustion, cool-off, cohort mismatch, privacy-stage conflict, retention/anonymization state, prior dismissal/report, third-party-data blocks, or similar private gates. Use fixed digest windows, jittered delivery, rate limits, safe-pool thresholds, and generic “no privacy-safe opportunity surfaced” language for requester-visible surfaces. Internal exact timing and reason data may exist only in service-side safety tables under RLS, retention limits, and redacted audit policy.
- Candidate-dependency snapshots are internal-only service fields. Snapshot fields for candidate opt-in status, discoverability, exposure version, inbound delegate settings, budget version, cohort membership, dependency invalidation, and candidate-specific stale causes may be stored only for server-side revalidation, safety review, and retention cleanup. They must not be returned through requester-facing APIs, receipts, exports, diagnostics, notifications, stale-brief explanations, telemetry, or public docs. Requester-visible dependency and stale labels must use generic categories such as `valid`, `stale_or_unavailable`, `recompute_required`, `privacy_or_consent_gate`, or `review_required`; candidate-owned views may show only the candidate's own coarse exposure/budget state and must not reveal requester identities or probing signals.
- Requester-facing opportunity data must be served through sanitized projections, not by direct reads from internal opportunity-brief rows. Participant ownership/RLS over an internal row is not sufficient when that row contains active candidate identifiers, stable candidate hashes, candidate-dependency snapshots, exact blocker states, exact timing, budget states, or retention/anonymization fields. Internal tables or columns containing those values must be service-role/operator-only, protected by database column-level grants, or split into separate internal tables. Ordinary authenticated UI/API paths must query a sanitized view or server-side DTO that physically excludes internal-only fields and exposes only requester-safe labels, buckets, redactions, and allowed actions. No route, client component, export, receipt renderer, telemetry event, or debug endpoint may use `select *` or equivalent against internal background-networking artifact tables.
- Requester-facing serialization must be default-deny and allowlist-based. Every requester-visible opportunity brief, stale-state response, delegate receipt, diagnostic, export, cache record, telemetry payload, and UI hydration payload must be produced by a versioned explicit output schema that enumerates allowed keys and rejects or strips unknown keys before logging, caching, telemetry, rendering, or network response. Do not infer requester-facing response types from internal database tables, ORM entities, GraphQL selection sets, TypeScript spread types, JSON schema generated from internal rows, or unreviewed contract generators. Adding any new requester-visible key requires an explicit schema-version update, privacy review, and tests showing it cannot reveal candidate identity, candidate-specific gates, timing side channels, or internal dependency snapshots.
- Opportunity briefs must snapshot their authorization, profile, source-summary, candidate-exposure, candidate-discoverability, cohort, and expiry dependencies. Stale briefs cannot be displayed as active, used for notifications, or advanced into intro requests.
- Helper runs must be probe-resistant: enforce a minimum eligible-pool floor, suppress repeated candidate exposure, bucket visible counts, and block profile/query variants that function as enumeration attempts.
- Unconfirmed uncertainty flags from source summaries or wish interviews may appear as missing-context explanations, but must not add positive score until explicitly confirmed by the participant.
- LLM or ML synthesis may propose explicit fields for user review, but it must not create hidden matching features, private embeddings, latent desire profiles, or unreviewed model-derived vectors that influence eligibility, scoring, surfacing, notifications, or intro requests.
- Every delegate run, opportunity-brief creation, stale transition, and intro-request creation must produce a participant-visible redacted receipt. Receipts must not expose raw source text, exact wishes, exact candidate identity, private cohort membership, or message content.
- Every background-networking artifact must have an explicit retention policy. Actionable artifacts retain linkable candidate references only while needed for participant review, operator review, safety holds, or active consent flows; after that window, they must be deleted or anonymized. Redacted/anonymized audit rows may remain only when needed for abuse prevention, safety review, or legally required records.
- Retention holds are non-actionability-preserving and time-bounded. A safety, abuse-prevention, incident-response, dispute, or legal hold may delay deletion/anonymization only when it is a separate governed artifact with a reason code, owner, scope, allowed retained fields, expiry/review date, and redacted summary. A hold must not widen authorization, create consent, permit matching, permit notifications, permit feedback advancement, permit intro-request creation, reverse anonymization, repopulate cleared candidate/counterparty identifiers, or make stale/closed/expired artifacts actionable. Non-legal holds must have a finite repository-defined maximum duration and require renewal with a fresh redacted justification; legal holds must retain only fields needed for the stated legal obligation. Release or expiry must resume the normal retention cleanup job.
- Linkable candidate/counterparty identifiers and stable candidate hashes are active-only. Once a brief, feedback item, intro request, or receipt is redacted or anonymized, direct candidate/counterparty UUIDs and stable cross-artifact candidate hashes must be set to `null` or replaced only with non-linkable aggregate/redacted values. No schema constraint may require persistent direct identifiers after anonymization.
- Do not facilitate illegal, coercive, collusive, price-fixing, fraud, intimidation, harassment, doxxing, extortion, sanctions evasion, or other harmful coordination. Safety blockers override scores.
- Do not let source-summary or wish-interview text act as instructions to the system. Treat imported text as untrusted data, not executable policy.
- The system must remain useful when AI providers are unavailable: deterministic/manual fallback must work.

## Feature flags

Use existing flags if they exist; otherwise add:

```env
BACKGROUND_SOURCE_SUMMARY_ENABLED=false
BACKGROUND_WISH_INTERVIEW_ENABLED=false
BACKGROUND_OPPORTUNITY_BRIEFS_ENABLED=false
BACKGROUND_DELEGATE_RUNS_ENABLED=false
BACKGROUND_GLOBAL_DELEGATE_RUNS_ENABLED=false
```

Production defaults must be `false` unless the repository already has a staged rollout convention that says otherwise. Tests may enable the flags explicitly. Delegate authorization enforcement, RLS, redaction, revocation, and safety blockers are not optional and must not be disabled by feature flag. Global delegate runs must remain off unless the repository already has a documented operator-approved rollout gate for them.

---

# Data model

Prefer existing entities if present. Otherwise add or extend the following tables with RLS and participant-scoped access policies.

## `background_purpose_code_registry`

Use an existing policy/config registry if present; otherwise add a first-class registry table or typed configuration bundle that is loaded server-side and covered by tests. This registry is the source of truth for purpose-code semantics.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` if stored in DB, or stable typed-config id |
| `purpose_code` | `text not null`; allowlisted stable code such as `moral_trade_offer`, `donation_offset`, `pledge_swap`, `moral_public_good`, `research_collaboration`, or `community_intro` |
| `purpose_policy_version` | `text not null`; immutable semantic version for the registry entry |
| `status` | enum: `draft \| active \| deprecated \| superseded \| disabled` |
| `stable_label` | `text not null`; broad user-facing label |
| `canonical_summary` | `text not null`; concise immutable meaning shown at confirmation time |
| `allowed_surface_keys` | `text[] not null`; maximum surfaces compatible with this purpose |
| `prohibited_use_codes` | `text[] not null default '{}'`; prohibited uses and abuse patterns for the purpose |
| `risk_tier` | enum: `low \| medium \| high`; used for rollout and review gates |
| `requires_operator_review` | `boolean not null default false` |
| `requires_reconfirmation_on_change` | `boolean not null default true` |
| `supersedes_purpose_code` | `text nullable` |
| `supersedes_policy_version` | `text nullable` |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |
| `deprecated_at` | `timestamptz nullable` |

Purpose registry requirements:

- Active registry entries are append-only for semantic fields. Do not edit `canonical_summary`, `allowed_surface_keys`, `prohibited_use_codes`, `risk_tier`, or `requires_operator_review` in place after activation. Use a new `purpose_policy_version` or a new `purpose_code`.
- User-created purpose codes are forbidden. Free-text purpose descriptions may explain intent to the user, but they are not executable policy and must not widen the registry meaning.
- Deprecated, superseded, disabled, missing, or materially changed registry entries must fail closed for new runs and mark dependent active briefs stale unless the relevant participants explicitly re-confirm under the new version.
- Registry labels and summaries shown in UI, receipts, docs, and API responses must be generated from the same registry source to prevent semantic drift.
- The registry must be included in route-contract and public-documentation tests so implementation, UI, and docs cannot silently diverge.

## `background_rollout_risk_reviews`

Use an existing governance/review table if present; otherwise add a compact review table. This is a deployment-safety artifact, not a user-facing matching surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `purpose_code` | `text not null` |
| `purpose_policy_version` | `text not null` |
| `allowed_surface_keys` | `text[] not null` |
| `audience_scope` | enum: `internal_staff \| cohort_only \| partner_matchmaker \| public_broad_preview` |
| `cohort_scope_id` | `text nullable` |
| `review_state` | enum: `draft \| approved \| expired \| revoked \| blocked` |
| `risk_tier` | enum: `low \| medium \| high` |
| `privacy_review_summary` | `text not null` |
| `abuse_case_summary` | `text not null` |
| `collusion_threat_summary` | `text not null` |
| `notification_review_summary` | `text not null` |
| `retention_review_summary` | `text not null` |
| `llm_data_handling_mode` | enum: `none \| no_training_no_retention \| tenant_isolated \| local_model` |
| `rollback_plan_summary` | `text not null` |
| `kill_switch_owner` | `text not null` |
| `approved_by` | `text nullable` |
| `approved_at` | `timestamptz nullable` |
| `expires_at` | `timestamptz not null` |
| `revoked_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Risk-review requirements:

- Any non-staff or external-pilot delegate run must reference a current approved risk review that exactly covers its purpose code, purpose-policy version, allowed surfaces, and audience/cohort scope.
- Risk reviews are time-bounded. Expired, revoked, blocked, missing, wrong-version, wrong-surface, or wrong-cohort reviews fail closed and must not allow new external delegate runs.
- Public-broad-preview or high-risk purpose/surface combinations require explicit operator approval and a documented rollback/kill-switch plan before any ordinary user can be exposed.
- Risk-review summaries must be redacted: they may document broad risk classes and mitigation status, but must not expose private cohort membership, exact wishes, source notes, raw prompts, candidate identities, or exploitable abuse heuristics.
- Promotion-gate tests must verify that feature flags alone cannot bypass risk-review requirements.


## `background_admin_safety_actions`

Use an existing admin audit / moderation action table if present; otherwise add a compact table for operator, reviewer, and break-glass safety actions. This table records safety interventions; it must not become an override channel for matching or disclosure.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `actor_id` | `uuid not null` or repository-standard operator identifier |
| `actor_role` | enum: `operator \| reviewer \| admin \| system` |
| `action_kind` | enum: `add_blocker \| mark_stale \| quarantine_artifact \| suppress_notification \| reject_intro_request \| approve_intro_review \| revoke_risk_review \| disable_purpose_code \| retention_hold \| retention_release` |
| `target_kind` | enum: `delegate_run \| opportunity_brief \| intro_request \| source_summary \| delegate_authorization \| candidate_exposure \| risk_review \| purpose_code` |
| `target_id` | `uuid not null` |
| `is_break_glass` | `boolean not null default false` |
| `hard_gate_snapshot` | `jsonb not null`; redacted pass/fail labels for the relevant non-waivable gates |
| `reason_code` | `text not null` |
| `redacted_summary` | `text not null` |
| `created_at` | `timestamptz` |

Admin safety-action requirements:

- Operator/admin actions must not create or widen participant authorization, candidate exposure, purpose-code scope, allowed surfaces, audience scope, or disclosure fields.
- Operator/admin actions must not mark stale artifacts valid, reverse anonymization, repopulate cleared candidate/counterparty identifiers, bypass minimum-pool checks, bypass risk-review requirements, or make hidden embeddings/latent features usable.
- `approve_intro_review` may only approve the next consent step when all non-waivable gates already pass; it must not itself disclose contact details or exact wishes.
- Break-glass actions are limited to abuse prevention, containment, suppression, quarantine, revocation, or retention holds/releases. They must not surface new candidates, send candidate-facing notices, reveal private fields, or advance stale artifacts.
- Admin safety actions must be redacted, RLS/service-role protected, and covered by audit tests. Public or participant-facing summaries may show only coarse action labels and redacted reasons.


## `background_retention_holds`

Use an existing retention/legal-hold table if present; otherwise add a compact table for time-bounded safety, abuse-prevention, incident-response, dispute, and legal holds. This table governs delayed deletion/anonymization only; it is not a matching, notification, disclosure, or consent surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `hold_kind` | enum: `safety_review \| abuse_investigation \| incident_response \| user_dispute \| legal_hold` |
| `scope_kind` | enum: `artifact \| participant \| cohort \| purpose_code \| purpose_policy_version \| surface \| audience_scope \| retention_class \| global` |
| `scope_value` | `text nullable`; null only for global holds |
| `target_kind` | enum: `delegate_run \| opportunity_brief \| feedback \| intro_request \| receipt \| source_summary \| participant_artifacts \| cohort_artifacts` |
| `target_id` | `uuid nullable`; required for artifact-scoped holds |
| `state` | enum: `active \| released \| expired` |
| `reason_code` | `text not null` |
| `redacted_summary` | `text not null` |
| `allowed_retained_field_keys` | `text[] not null`; minimum fields allowed to remain linkable during the hold |
| `linkable_identifier_allowance` | enum: `none \| artifact_ids_only \| direct_counterparty_ids \| legally_required_identifiers` |
| `owner_id` | `uuid not null` or repository-standard operator/legal owner identifier |
| `review_due_at` | `timestamptz not null` |
| `expires_at` | `timestamptz not null` for non-legal holds; nullable only where legal policy requires an open-ended legal hold |
| `legal_basis_ref` | `text nullable`; required for `legal_hold`, redacted in ordinary views |
| `created_at` | `timestamptz` |
| `released_at` | `timestamptz nullable` |
| `release_summary` | `text nullable` |

Retention-hold requirements:

- A retention hold may delay cleanup only for records and fields inside its explicit scope and `allowed_retained_field_keys`. It must not retain raw source text, exact wishes, candidate/counterparty identifiers, private cohort membership, prompts, message text, or free-text reports unless the hold's field allowance and legal/safety justification specifically require that field.
- A hold must not make any stale, closed, expired, redacted, or anonymized artifact actionable. Held artifacts are usable only for the stated safety, abuse-prevention, incident-response, dispute, or legal review.
- Non-legal holds must be time-bounded with a repository-defined maximum duration and cannot be renewed without a fresh redacted justification, owner, and review date. Legal holds may follow legal requirements but must still be field-minimized, owner-assigned, redacted in ordinary views, and periodically reviewed where legally permissible.
- Release or expiry must enqueue idempotent retention cleanup and must not automatically resume matching, notifications, feedback advancement, intro requests, or disclosure. Recompute from currently valid inputs is required before any normal action resumes.
- Participant-facing and analytics surfaces may show only coarse hold state and redacted reason categories; they must not expose legal strategy, hidden abuse heuristics, source notes, exact wishes, candidate identities, or private cohort membership.


## `background_emergency_controls`

Use an existing incident-response / kill-switch table if present; otherwise add a compact emergency-control table. This table is for scoped containment during privacy, abuse, collusion, notification, prompt-injection, retention, or matching-safety incidents. It must not become an override channel.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `scope_kind` | enum: `global \| purpose_code \| purpose_policy_version \| surface \| audience_scope \| cohort \| notification_path \| llm_mode \| retention_class` |
| `scope_value` | `text nullable`; null only for global controls |
| `state` | enum: `active \| released \| expired` |
| `reason_code` | `text not null` |
| `redacted_summary` | `text not null` |
| `activated_by` | `uuid not null` or repository-standard operator identifier |
| `activated_at` | `timestamptz not null` |
| `expires_at` | `timestamptz nullable` |
| `released_by` | `uuid nullable` or repository-standard operator identifier |
| `released_at` | `timestamptz nullable` |
| `release_summary` | `text nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Emergency-control requirements:

- Active emergency controls are hard blockers for every matching, surfacing, notification, feedback-advancement, intro-request, and candidate-facing exposure path within their scope.
- Activation must cancel or pause pending delegate runs and mark dependent active opportunity briefs, receipts, and intro requests as stale or emergency-paused where applicable.
- Release must be explicit, redacted, audited, and must not automatically resume stale artifacts; recompute from currently valid inputs is required before action resumes.
- Emergency controls must not reveal exact wishes, source notes, candidate identities, private cohort membership, prompts, message text, hidden abuse heuristics, or sensitive admin notes.
- Emergency controls must be checked server-side and covered by tests so feature flags, fixtures, admin actions, or break-glass paths cannot bypass them.


## `background_runtime_safety_tripwires`

Use an existing monitoring / safety-tripwire table if present; otherwise add a compact table for runtime fail-closed controls. This table configures detection and response for known background-networking failure modes; it must not store private source content or become a general analytics feature store.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `tripwire_code` | `text not null`; stable allowlisted code such as `unsafe_notification_attempt`, `candidate_facing_scan_exposure`, `latent_vector_match_attempt`, `risk_review_missing_or_expired`, `rls_or_encryption_failure`, `retention_cleanup_failure`, `anti_probe_threshold_breach`, or `report_spike` |
| `severity` | enum: `review_only \| blocking` |
| `scope_kind` | enum: `global \| purpose_code \| purpose_policy_version \| surface \| audience_scope \| cohort \| notification_path \| llm_mode \| retention_class` |
| `scope_value` | `text nullable`; null only for global tripwires |
| `signal_sources` | `text[] not null`; redacted aggregate sources only |
| `signal_trust_class` | enum: `trusted_invariant \| platform_integrity \| operator_confirmed \| user_controllable_aggregate \| mixed` |
| `max_auto_scope_kind` | enum: `artifact \| participant \| cohort \| surface \| purpose_code \| global`; broad scopes require trusted or corroborated signals |
| `requires_corroboration` | `boolean not null default true` for user-controllable or mixed signals |
| `corroboration_sources` | `text[] not null default '{}'`; redacted trusted sources required before broad auto-pausing |
| `threshold_config` | `jsonb not null`; redacted thresholds, not raw private events |
| `state` | enum: `active \| paused \| disabled` |
| `last_triggered_at` | `timestamptz nullable` |
| `last_trigger_reason` | `text nullable` |
| `emergency_control_id` | `uuid nullable`; populated when a blocking tripwire activates a scoped emergency stop |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Runtime tripwire requirements:

- Blocking tripwires for non-waivable gate failures must fail closed before run creation, scoring, notification, opportunity-brief creation, feedback advancement, candidate-facing exposure, or intro-request creation.
- Triggered blocking tripwires must activate the narrowest applicable emergency control or pause the affected lane; they must not wait for manual review when the detected condition is a known invariant failure.
- Tripwires must distinguish direct invariant/platform-integrity failures from user-controllable aggregate signals. Report spikes, mass dismissals, suspicious feedback, and other user-controllable signals must be deduplicated, rate-limited, and reputation/cool-off aware; they may not auto-trigger broad stops unless corroborated by trusted invariant/platform-integrity signals or operator-confirmed evidence.
- Review-only tripwires may queue operator review for anomalous aggregate metrics, but they must not be used to widen matching, disclosure, notification, or candidate exposure.
- Tripwire signals must be privacy-safe aggregates or redacted pass/fail labels. They must not include exact wishes, source notes, raw prompts, message text, candidate identities, private cohort membership, embeddings, latent vectors, hidden abuse heuristics, or free-text reports.
- Tripwire configuration and output must be covered by tests so feature flags, fixtures, operator/admin actions, or break-glass paths cannot bypass blocking tripwires.


## `background_wish_profiles`

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `opt_in_status` | enum: `off \| active \| paused \| deleted` |
| `cause_areas` | `text[]` |
| `offered_resources` | `text[]` |
| `requested_resources` | `text[]` |
| `capabilities` | `text[]` |
| `constraints` | `text[]` |
| `trade_modes` | `text[]` |
| `verification_preferences` | `text[]` |
| `coarse_availability` | `text[]` |
| `coarse_location` | `text nullable` |
| `privacy_stage` | enum: `private \| broad_preview \| detail_request \| mutual_consent` |
| `discoverability_scope` | enum: `owner_only \| cohort_only \| public_broad_preview` |
| `inbound_delegate_discovery` | enum: `off \| cohort_only \| partner_matchmaker \| public_broad_preview`; default `off` |
| `inbound_delegate_purpose_codes` | `text[] not null default '{}'`; explicit allowlist of purpose categories for which this profile may be surfaced |
| `inbound_delegate_purpose_bindings` | `jsonb not null default '{}'`; explicit `{purpose_code, purpose_policy_version}` bindings confirmed by the candidate for each inbound purpose |
| `inbound_delegate_surfaces` | `text[] not null default '{}'`; may include `broad_profile` only after explicit candidate confirmation |
| `inbound_delegate_surface_budget_per_window` | `jsonb not null default '{}'`; per-purpose/per-audience/per-cohort surfacing budget and window settings for inbound delegate discovery |
| `inbound_delegate_pending_intro_limit` | `integer nullable`; maximum pending intro requests allowed from delegate-mediated discovery; required for non-`off` inbound discovery unless a stricter repository default exists |
| `inbound_delegate_cooloff_until` | `timestamptz nullable`; candidate-controlled or safety-imposed cool-off for inbound delegate surfacing |
| `candidate_inbound_budget_version` | `text not null` |
| `candidate_exposure_version` | `text not null` |
| `allowed_cohort_ids` | `text[] not null default '{}'` |
| `stated_exclusions` | `text[]` |
| `uncertainty_flags` | `jsonb` |
| `source_scope_version` | `text` |
| `profile_version` | `text not null` |
| `last_confirmed_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Candidate exposure requirements:

- `inbound_delegate_discovery` must default to `off` for new, imported, migrated, reactivated, or privacy-reset profiles.
- General `discoverability_scope` must not automatically populate or widen `inbound_delegate_discovery`; inbound delegate discovery requires a separate explicit candidate confirmation.
- `inbound_delegate_purpose_codes` must default to an empty set and must be explicitly confirmed separately from ordinary profile discoverability.
- `inbound_delegate_purpose_bindings` must default to an empty map/array and must bind every confirmed inbound purpose code to the exact purpose-policy version shown to the candidate at confirmation time. `inbound_delegate_purpose_codes` must be derived from, or invariant-consistent with, these bindings. A purpose-code registry change, deprecation, split, merge, or material semantic change must not silently preserve prior candidate exposure.
- `inbound_delegate_discovery` must not be broader than `discoverability_scope`.
- `inbound_delegate_surfaces` must default to an empty set and must be limited to broad-preview-safe fields unless a later consent stage explicitly grants more.
- Non-`off` inbound delegate discovery must require explicit budget settings or repository-safe defaults for per-window surfacing, pending intro requests, and cool-off behavior. Unbounded inbound surfacing is invalid.
- Candidate surfacing budgets must be enforced server-side across requesters and runs. Participant-facing views may show broad budget status, but must not reveal requester identities, exact sparse counts, private cohort membership, or candidate-specific probing signals.
- Any budget widening, public-scope budget change, or pending-intro-limit increase requires explicit candidate confirmation and updates `candidate_inbound_budget_version`. Budget narrowing, pause, or cool-off activation must take effect immediately and mark affected active briefs stale or blocked.
- Public-broad-preview inbound delegate discovery requires both explicit candidate confirmation and the same global/operator rollout gate required for global delegate runs.
- Any change to `opt_in_status`, `discoverability_scope`, `inbound_delegate_discovery`, `inbound_delegate_purpose_codes`, `inbound_delegate_surfaces`, inbound budget settings, `allowed_cohort_ids`, or `privacy_stage` must update `candidate_exposure_version` and/or `candidate_inbound_budget_version` and mark dependent active briefs `stale` or budget-blocked.

## `background_candidate_exposure_counters`

Use an existing quota/budget table if present; otherwise add a compact server-side table for candidate-side exposure and intro-burden accounting. This table enforces candidate-selected inbound budgets; it is not a public analytics surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `candidate_profile_id` | `uuid nullable`; required only while `counter_reference_state = active` |
| `counter_reference_state` | enum: `active \| redacted \| anonymized` |
| `purpose_code` | `text not null` |
| `purpose_policy_version` | `text not null` |
| `audience_scope` | enum: `cohort_only \| partner_matchmaker \| public_broad_preview` |
| `cohort_scope_id` | `text nullable` |
| `window_start` | `timestamptz not null` |
| `window_end` | `timestamptz not null` |
| `surface_count` | `integer not null default 0`; service-side exact count, never exposed directly when sparse |
| `pending_intro_count` | `integer not null default 0`; service-side exact count, never exposed directly when sparse |
| `suppressed_for_budget_count` | `integer not null default 0`; service-side exact count, never exposed directly when sparse |
| `budget_state` | enum: `clear \| near_limit \| exhausted \| cooloff` |
| `candidate_inbound_budget_version_snapshot` | `text not null` |
| `last_surface_at` | `timestamptz nullable` |
| `last_intro_request_at` | `timestamptz nullable` |
| `retention_expires_at` | `timestamptz not null` |
| `anonymized_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Candidate exposure-counter requirements:

- Budget counters must be keyed by candidate, purpose-code/version, audience scope, cohort where applicable, and window. They must be checked before candidate scoring, opportunity-brief creation, feedback advancement, candidate-facing exposure, and intro-request creation.
- Budget checks and counter updates must be atomic and idempotent. Use a serializable transaction, row-level lock, database constraint, or repository-standard quota primitive so concurrent runs cannot create more surfaces or intro paths than the candidate allowed. If the implementation uses reservations, reservations must be short-lived, scoped to one pending action, released on failure/cancellation/staleness, and excluded from telemetry except as redacted aggregate state.
- Candidate-facing budget status may be shown as coarse status such as `clear`, `near_limit`, `exhausted`, or `cooloff`; do not show exact sparse counts, requester identities, or private cohort membership.
- Requester-facing outputs must not reveal whether a candidate was withheld because of budget exhaustion, cool-off, opt-out, exposure mismatch, cohort mismatch, privacy state, retention state, prior dismissal/report, or any other candidate-specific gate. Return only generic privacy/availability/safe-pool/review categories to the requester.
- Any requester-visible counts or aggregates derived from counter rows must be bucketed, suppressed, or aggregated over a sufficiently broad safe pool. Do not expose exact per-candidate, per-gate, per-window, or per-category counts through briefs, receipts, diagnostics, telemetry, public reports, or API responses.
- Exhausted or cool-off counters are hard blockers for additional surfacing or intro advancement until the window resets, the candidate explicitly widens the budget, or an operator narrows/suppresses already-created artifacts.
- Counter rows must not be used for ranking, popularity metrics, engagement optimization, or public analytics. They exist only for consent-respecting burden control, anti-harassment, and safety review.
- Retention and anonymization rules for candidate/counterparty identifiers apply to counter rows; after the relevant window and safety/legal holds, direct candidate identifiers must be cleared, and counter rows must become non-linkable aggregate/redacted records or be deleted according to the retention policy. `counter_reference_state = redacted` may preserve coarse budget state and aggregate counts only; `counter_reference_state = anonymized` must be unusable for matching, surfacing, notifications, feedback advancement, intro requests, or candidate-specific analytics.

## `background_delegate_authorizations`

Use an existing consent / grant / delegate-strategy table if present; otherwise add a compact authorization table. Every delegate run must reference one active authorization.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `status` | enum: `draft \| active \| paused \| revoked \| expired` |
| `allowed_purpose_codes` | `text[] not null`; explicit allowlist of broad coordination purposes, matching the codes in `allowed_purpose_bindings` |
| `allowed_purpose_bindings` | `jsonb not null`; explicit `{purpose_code, purpose_policy_version}` bindings confirmed by the participant for each allowed purpose |
| `purpose_description` | `text nullable`; short user-facing explanation of the mandate, not used as executable policy |
| `allowed_surfaces` | `text[] not null` such as `broad_profile`, `approved_source_summary`, `saved_search` |
| `allowed_cohort_ids` | `text[] not null default '{}'` |
| `audience_scope` | enum: `cohort_only \| partner_matchmaker \| public_broad_preview` |
| `min_confidence_band` | enum: `medium \| high` |
| `max_runs_per_week` | `integer not null` |
| `max_briefs_per_week` | `integer not null` |
| `max_candidates_per_run` | `integer not null` |
| `expires_at` | `timestamptz not null` |
| `revoked_at` | `timestamptz nullable` |
| `authorization_version` | `text not null` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Requirements:

- `allowed_purpose_codes` must be nonempty, allowlisted, and narrower than a general-purpose networking mandate.
- `allowed_purpose_bindings` must bind each allowed purpose code to the exact registry version presented to the participant; material changes to purpose-code meanings require explicit re-confirmation rather than silent reuse.
- If multiple purpose codes are authorized, they authorize separate single-purpose runs only; they must not authorize a combined multi-purpose scan, and each run must select exactly one bound `{purpose_code, purpose_policy_version}` pair.
- `audience_scope` defaults to `cohort_only` or the repository’s safest equivalent.
- `public_broad_preview` authorization is allowed only if `BACKGROUND_GLOBAL_DELEGATE_RUNS_ENABLED=true` and an operator-approved rollout gate exists.
- Revoked or expired authorizations must cancel pending delegate runs, prevent future opportunity creation, and mark dependent active briefs as `stale`.

## `background_source_summaries`

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `source_kind` | enum: `manual_note \| public_url \| file_export \| chatbot_export \| email_export \| calendar_export \| other` |
| `status` | enum: `draft \| pending_review \| approved \| rejected \| expired \| revoked` |
| `summary_ciphertext` | `bytea not null` |
| `summary_key_version` | `integer not null` |
| `allowed_field_keys` | `text[] not null` |
| `confirmed_broad_tags` | `text[] not null default '{}'`; only explicitly confirmed broad tags may influence matching |
| `confirmed_broad_tag_confirmations` | `jsonb not null default '[]'`; per-tag confirmation records containing at minimum tag, allowed field key, source-summary version, confirmation version, confirmation actor, and confirmed_at |
| `unconfirmed_derived_tags` | `text[] not null default '{}'`; proposal-only derived tags that must not influence matching until explicitly confirmed |
| `uncertainty_flags` | `jsonb not null default '[]'` |
| `source_summary_version` | `text not null` |
| `provenance_label` | enum: `manual_user_text \| explicit_export \| public_url_summary \| imported_summary` |
| `third_party_data_state` | enum: `none_detected \| redacted \| needs_review \| contains_private_third_party_data`; default `none_detected` |
| `third_party_redaction_version` | `text nullable` |
| `retention_expires_at` | `timestamptz not null` |
| `raw_ingestion_allowed` | `boolean not null default false` |
| `ai_shadow_allowed` | `boolean not null default false` |
| `created_at` | `timestamptz` |
| `approved_at` | `timestamptz nullable` |
| `revoked_at` | `timestamptz nullable` |

Constraint:

- `raw_ingestion_allowed` must default to `false`.
- `raw_ingestion_allowed` must not be user-flippable from ordinary UI.
- Source-summary synthesis may create proposed tags for review, but only `confirmed_broad_tags` may influence matching. Do not add or use `derived_broad_tags` as a separate matchable field; if an existing schema already has `derived_broad_tags`, treat it as a legacy proposal-only alias for `unconfirmed_derived_tags`, migrate it where feasible, and invariant-test that it cannot influence eligibility, scoring, surfacing, notifications, opportunity briefs, or intro requests. Unconfirmed tags, hidden embeddings, latent vectors, private source-derived representations, or unreviewed summaries must not influence eligibility, scoring, surfacing, notifications, opportunity briefs, or intro requests.
- Source-summary `approved` status is necessary but not sufficient for tag influence. Approval may retain the summary and allow the user to review proposed tags, but matching may use only tags listed in `confirmed_broad_tags` with corresponding explicit confirmation records for the current `source_summary_version` and allowed-field policy.
- Bulk tag confirmation is valid only if the UI/API displays each tag and allowed-field key being confirmed and records per-tag confirmation metadata. Revoking or changing tag confirmation must remove future matching influence and mark dependent active briefs stale.
- Private third-party data must not become match input. If a source summary includes private third-party identifiers, contact details, wishes, constraints, capabilities, vulnerabilities, affiliations, or strategy, set `third_party_data_state` to `needs_review` or `contains_private_third_party_data`; do not allow confirmed matching tags from that material until it is redacted to participant-owned wishes/offers/capabilities or non-sensitive public context. Third-party participation must be represented by that person's own profile and candidate-exposure consent, not by another participant's imported text.

## `background_delegate_runs`

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `delegate_authorization_id` | `uuid not null` referencing the active authorization or existing grant equivalent |
| `trigger_kind` | enum: `saved_search \| profile_update \| approved_source_summary \| scheduled_digest \| manual_scan` |
| `state` | enum: `queued \| running \| retry \| done \| failed \| cancelled` |
| `query_fingerprint` | `text not null` |
| `cohort_scope_id` | `text nullable` |
| `allowed_surfaces_snapshot` | `text[] not null` |
| `purpose_code_snapshot` | `text not null` |
| `purpose_policy_version_snapshot` | `text not null` |
| `max_candidates` | `integer not null` |
| `eligible_pool_size_bucket` | enum: `withheld \| 5_to_9 \| 10_to_24 \| 25_plus` |
| `anti_probe_state` | enum: `clear \| broadened \| withheld \| blocked` |
| `receipt_id` | `uuid nullable` |
| `retention_expires_at` | `timestamptz not null` |
| `anonymized_at` | `timestamptz nullable` |
| `attempts` | `integer not null default 0` |
| `next_run_at` | `timestamptz not null` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

## `background_opportunity_briefs`

Use an existing table if present; otherwise add:

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `candidate_profile_id` | `uuid nullable`; required only while `candidate_reference_state = active` |
| `delegate_run_id` | `uuid nullable` |
| `delegate_authorization_id` | `uuid not null` |
| `cohort_scope_id` | `text nullable` |
| `status` | enum: `new \| viewed \| dismissed \| deferred \| reported \| intro_requested \| closed` |
| `confidence_band` | enum: `low \| medium \| high` |
| `visible_headline` | `text not null` |
| `factor_codes` | `text[] not null` |
| `blocker_codes` | `text[] not null default '{}'` |
| `safety_blocker_codes` | `text[] not null default '{}'` |
| `redacted_fields` | `text[] not null` |
| `visible_counts` | `jsonb not null` with bucketed values only |
| `explanation_version` | `text not null` |
| `source_scope_version` | `text not null` |
| `profile_version_snapshot` | `text not null` |
| `authorization_version_snapshot` | `text not null` |
| `source_summary_ids_snapshot` | `uuid[] not null default '{}'` |
| `source_summary_versions_snapshot` | `jsonb not null default '{}'` |
| `candidate_discoverability_snapshot` | `text not null` |
| `candidate_opt_in_snapshot` | enum: `active \| paused \| deleted \| off` |
| `candidate_exposure_version_snapshot` | `text not null` |
| `candidate_inbound_delegate_discovery_snapshot` | `text not null` |
| `purpose_code_snapshot` | `text not null` |
| `purpose_policy_version_snapshot` | `text not null` |
| `dependency_state` | enum: `valid \| stale \| closed` |
| `brief_expires_at` | `timestamptz not null` |
| `eligible_pool_size_bucket` | enum: `withheld \| 5_to_9 \| 10_to_24 \| 25_plus` |
| `candidate_key_hash` | `text nullable; active-only dedupe key, cleared or replaced with non-linkable aggregate state on redaction/anonymization` |
| `candidate_reference_state` | enum: `active \| redacted \| anonymized` |
| `receipt_id` | `uuid nullable` |
| `cooloff_until` | `timestamptz nullable` |
| `retention_expires_at` | `timestamptz not null` |
| `anonymized_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Candidate dependency snapshot requirements:

- `candidate_discoverability_snapshot`, `candidate_opt_in_snapshot`, `candidate_exposure_version_snapshot`, `candidate_inbound_delegate_discovery_snapshot`, candidate budget-version snapshots if added, and candidate-specific stale-cause fields are internal-only service fields.
- These fields may be used for server-side stale checks, retention cleanup, safety review, and operator review, but must not be returned through requester-facing APIs, receipts, exports, diagnostics, telemetry, notifications, or public reports.
- Requester-visible dependency labels, stale reasons, and recompute notices must be generic and must not reveal whether the candidate opted out, changed exposure settings, exhausted a budget, entered cool-off, left a cohort, changed privacy stage, hit retention/anonymization, or triggered any other candidate-specific gate.
- When `candidate_reference_state` becomes `redacted` or `anonymized`, clear or coarsen any candidate-dependency snapshot values that could be joined back to a profile or candidate-specific artifact, preserving only non-linkable generic dependency-state labels where policy allows.

Sanitized projection requirements:

- Provide a sanitized participant-facing projection, view, or server-side DTO for opportunity briefs, such as `background_opportunity_brief_previews`, if the repository uses database-backed views.
- Ordinary authenticated requester routes must read from the sanitized projection/DTO rather than from the internal `background_opportunity_briefs` row shape.
- The sanitized projection may include only requester-safe fields: visible headline, confidence band, public factor codes, generic blocker/safety labels, bucketed visible counts, broad scanned-surface labels, broad authorization-scope label, purpose label, generic dependency-state label, receipt id, retention/deletion state where requester-owned, and allowed actions.
- The sanitized projection must exclude `candidate_profile_id`, `candidate_key_hash`, `counterparty_profile_id`, candidate opt-in/discoverability/exposure/budget/cohort snapshots, candidate-specific stale causes, exact internal blocker states, exact timing fields, exact retention/anonymization causes, free-text feedback, source notes, and any field that can join the artifact back to a candidate.
- Participant-facing RLS may apply to the sanitized projection. Internal opportunity-brief tables or internal-only columns must remain service-role/operator-only, protected by database column grants, or split into separate internal tables so ordinary authenticated clients cannot retrieve internal fields even for their own participant-owned briefs.
- Route handlers, client components, receipt renderers, telemetry builders, exports, and debug endpoints must not use `select *` or schema-spreading over internal background-networking artifact rows.
- The sanitized projection/DTO must have a versioned allowlist schema, such as a Zod/object schema or repository-standard equivalent, with exact-key tests. Unknown fields, newly added internal columns, ORM relation objects, debug metadata, and accidental spread fields must be rejected or stripped before response construction, caching, logging, telemetry, receipt rendering, export generation, or client hydration.
- Snapshot or contract tests must assert the complete requester-facing key set for each output version, and any new key must require an intentional schema-version change plus privacy review.

Candidate reference-state requirements:

- `candidate_profile_id` and `candidate_key_hash` may be populated only while `candidate_reference_state = active` and the brief is inside the participant-review, operator-review, safety-hold, or active-consent window.
- When `candidate_reference_state` becomes `redacted` or `anonymized`, clear `candidate_profile_id`; clear `candidate_key_hash` or replace it only with a non-linkable aggregate/redaction bucket that cannot join the artifact back to a profile or to other candidate-specific artifacts.
- `candidate_reference_state = redacted` may preserve coarse reason codes, confidence band, retention state, and aggregate safety labels, but not direct or stable candidate identifiers.
- `candidate_reference_state = anonymized` must be unusable for matching, notifications, feedback advancement, intro requests, disclosure grants, repeated-candidate dedupe, or candidate-specific analytics.

## `background_opportunity_feedback`

Use an existing table if present; otherwise add:

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `opportunity_brief_id` | `uuid not null` |
| `decision` | enum: `interested \| dismissed \| maybe_later \| report` |
| `reason_code` | `text nullable` |
| `free_text_ciphertext` | `bytea nullable` |
| `free_text_key_version` | `integer nullable` |
| `retention_expires_at` | `timestamptz not null` |
| `anonymized_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |

## `background_intro_requests`

Use an existing table if present; otherwise add:

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `requester_id` | `uuid not null` |
| `counterparty_profile_id` | `uuid nullable`; required only while `counterparty_reference_state = active` |
| `opportunity_brief_id` | `uuid nullable` |
| `state` | enum: `requested \| operator_review \| counterparty_pending \| mutual_consent \| approved_contact \| declined \| appealed \| closed` |
| `requested_disclosure_fields` | `text[] not null` |
| `purpose` | `text not null` |
| `purpose_code` | `text not null` |
| `purpose_policy_version` | `text not null` |
| `source_brief_dependency_state` | enum: `valid \| stale_blocked` |
| `counterparty_reference_state` | enum: `active \| redacted \| anonymized` |
| `receipt_id` | `uuid nullable` |
| `expires_at` | `timestamptz not null` |
| `retention_expires_at` | `timestamptz not null` |
| `closed_at` | `timestamptz nullable` |
| `anonymized_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Counterparty reference-state requirements:

- `counterparty_profile_id` may be populated only while `counterparty_reference_state = active` and the intro request is in an active consent/review state.
- When an intro request is declined, closed, expired, deleted, or past its safety/legal hold, set `counterparty_reference_state` to `redacted` or `anonymized` and clear `counterparty_profile_id` unless a legally required or active safety hold explicitly requires retaining it.
- Redacted/anonymized intro-request records may preserve coarse state, dates, decision labels, and redacted audit metadata, but must not preserve a direct counterparty UUID or any stable candidate-specific join key.

## `background_delegate_receipts`

Use an existing transparency-receipt or audit-event table if present; otherwise add a compact participant-visible receipt table. This table is for redacted accountability, not analytics export.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `event_kind` | enum: `delegate_run_created \| opportunity_brief_created \| opportunity_brief_marked_stale \| intro_request_created` |
| `delegate_authorization_id` | `uuid nullable` |
| `delegate_run_id` | `uuid nullable` |
| `opportunity_brief_id` | `uuid nullable` |
| `redacted_payload` | `jsonb not null` |
| `prev_hash` | `text nullable` |
| `entry_hash` | `text not null` |
| `retention_expires_at` | `timestamptz not null` |
| `anonymized_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |

Receipt payload requirements:

- Include broad purpose code, purpose-policy version, broad surfaces used, authorization scope type, confidence band, dependency-state label, and visible count buckets. Factor-code and blocker-code counts may be included only as requester-safe bucketed/generic aggregates; candidate-specific gate counts must be suppressed or coarsened so they cannot reveal opt-out, budget, cohort, privacy-stage, retention, prior-dismissal/report, or third-party-data state.
- Exclude raw source text, exact wishes, contact details, exact candidate identity, exact private cohort membership, prompts, message text, free-text reports, and private notes.
- If the repository already has local transparency receipts, extend that mechanism rather than creating a parallel ledger.

Retention lifecycle requirements:

- Active opportunity briefs may keep internal candidate references only until `brief_expires_at`, closure, dismissal, report resolution, intro-request conversion, or participant deletion, whichever retention policy says comes first.
- After the retention window and any safety-review hold, replace linkable candidate references with non-linkable redacted state, clear active-only `candidate_profile_id`, `counterparty_profile_id`, and stable `candidate_key_hash` values, delete or anonymize free-text feedback, and keep only aggregate/redacted audit metadata.
- Participant deletion must remove participant-owned background artifacts except redacted/anonymized audit rows explicitly retained for safety, abuse prevention, or legal obligations.
- Retention jobs must be idempotent and auditable through redacted receipts, without exporting raw source text, exact wishes, exact candidate identity, or private cohort membership.


---

# APIs

Prefer existing paths if already implemented. Otherwise implement the following.

## `GET /api/background/purpose-codes`

Auth optional for broad public docs; auth required if returning rollout-gated or cohort-specific availability.

Returns the current active purpose-code registry entries that the user may select.

Requirements:

- Return only broad labels, canonical summaries, purpose codes, purpose-policy versions, risk tiers, and allowed broad surfaces.
- Do not return internal abuse heuristics, private rollout notes, exact cohort membership, disabled experimental codes, or deprecated internal-only purpose notes.
- The values returned by this route must come from the same registry artifact used by authorization, candidate-exposure, delegate-run, opportunity-brief, receipt, intro-request, and test validation.
- If a purpose code is deprecated, superseded, disabled, or requires re-confirmation, the route must clearly mark that state and must not present it as selectable for new authorization.

## `POST /api/background/delegate-authorizations`

Auth required.

Creates or updates the participant’s standing authorization for a background delegate.

Requirements:

- Validate allowed purpose codes and allowed surfaces against allowlists.
- Validate purpose codes against the current versioned purpose-code registry; reject user-defined purpose codes, deprecated codes, disabled codes, superseded codes without explicit migration, catch-all codes, and any request that tries to rely on a materially changed purpose code without explicit re-confirmation.
- Store exact per-purpose `allowed_purpose_bindings` from the registry records shown to the participant at confirmation time; do not accept client-supplied versions that do not match the server registry.
- Require an expiry date, maximum runs per week, maximum briefs per week, maximum candidates per run, and minimum confidence band.
- Default audience scope to `cohort_only` or `partner_matchmaker`; do not allow global scope unless `BACKGROUND_GLOBAL_DELEGATE_RUNS_ENABLED=true` and operator rollout approval exists.
- Return the authorization id and a plain-language summary of the delegate's purpose, what it may search, and what it is not allowed to do.
- Do not enqueue a helper run from this route unless the user explicitly chooses “run now.”

## `POST /api/background/delegate-authorizations/:id/revoke`

Auth required.

Revokes a delegate authorization. Pending runs under that authorization must be cancelled, dependent active briefs must be marked `stale`, and no new opportunity briefs may be created from it. Revocation must also schedule retention cleanup for closed, stale, or expired dependent artifacts according to the artifact lifecycle policy.

## `POST /api/background/wish-profile`

Auth required.

Creates or updates a structured wish profile.

Requirements:

- Validate against an allowlist schema.
- Reject exact contact details.
- Reject protected-trait inference.
- Reject ideology/psychology inference.
- Reject hidden preference fields.
- Do not trigger live matching unless `BACKGROUND_DELEGATE_RUNS_ENABLED` is true, the user explicitly opted in, and an active delegate authorization exists.
- Validate `discoverability_scope` and `allowed_cohort_ids`; global broad-preview discovery must not be silently enabled.
- Do not create, widen, or re-enable `inbound_delegate_discovery` from this route. Profile discoverability updates must not silently change delegate-mediated exposure.
- Update `profile_version` and `last_confirmed_at` only when the participant explicitly applies or confirms the fields that may influence matching.

## `POST /api/background/candidate-exposure`

Auth required.

Creates, narrows, widens, pauses, or revokes the participant's inbound delegate discovery settings.

Requirements:

- Treat this as a separate consent action from ordinary profile discoverability.
- Default new, imported, migrated, reactivated, or privacy-reset profiles to `inbound_delegate_discovery = off` and `inbound_delegate_surfaces = {}`.
- Require an explicit confirmation step before setting `inbound_delegate_discovery` to `cohort_only`, `partner_matchmaker`, or `public_broad_preview`.
- Require explicit allowlisted `inbound_delegate_purpose_codes`; reject empty purpose sets for any non-`off` inbound delegate setting.
- Confirm inbound purpose codes against the current server-side purpose-code registry and store per-purpose `inbound_delegate_purpose_bindings`; if the registry version changes materially, require re-confirmation before surfacing under affected purpose codes. Do not trust client-supplied purpose labels, free-text explanations, or stale registry versions.
- Reject any requested inbound scope broader than the current `discoverability_scope`.
- Reject `public_broad_preview` inbound discovery unless the global delegate flag is enabled and operator rollout approval exists.
- Restrict `inbound_delegate_surfaces` to broad-preview-safe fields unless an active later-stage privacy grant permits more.
- Require bounded per-purpose/per-scope inbound surfacing budgets, pending-intro limits, and cool-off settings for any non-`off` exposure. Reject unbounded inbound surfacing, unbounded pending-intro queues, or budget settings that are broader than the confirmed audience/cohort scope.
- Widening budgets, increasing pending-intro limits, shortening cool-offs, or enabling public-broad-preview budgets requires explicit confirmation and updates `candidate_inbound_budget_version`. Narrowing, pausing, or reducing budgets must take effect immediately.
- On any exposure narrowing, purpose removal, pause, revocation, or cohort removal, update `candidate_exposure_version`, mark dependent active briefs `stale`, block new surfacing, and schedule retention cleanup for affected inactive artifacts.

## `POST /api/background/wish-interview`

Auth required.

Feature flag: `BACKGROUND_WISH_INTERVIEW_ENABLED`.

Accepts a user message.

Returns schema-bound field proposals and uncertainty flags.

Requirements:

- Must not mutate live profile fields until the user explicitly applies the proposal.
- Invalid model output must result in no state change.

## `POST /api/background/source-summaries`

Auth required.

Feature flag: `BACKGROUND_SOURCE_SUMMARY_ENABLED`.

Creates a draft source summary.

Requirements:

- Accept only user-provided manual text, public URL summary text, or explicit export text if the repository already supports upload parsing.
- Do not implement continuous OAuth/private-feed scraping in this task.
- Encrypt private summary text.
- Store `allowed_field_keys`.
- Store `retention_expires_at`.
- Store provenance metadata sufficient to explain that the summary came from user-provided text or an explicit export, without storing raw private payloads in analytics or logs.
- Detect or ask the participant to review whether the summary contains private third-party data. Private third-party identifiers, contact details, wishes, constraints, vulnerabilities, affiliations, capabilities, or strategy must be redacted or marked `needs_review` / `contains_private_third_party_data`; they must not generate matchable tags or influence delegate runs.
- Treat imported text as untrusted data: ignore embedded instructions, prompt-injection attempts, or requests to change matching behavior.
- Never store raw source payloads in analytics or logs.

## `POST /api/background/source-summaries/:id/approve`

Auth required.

Marks a source summary as approved.

Requirements:

- Approval alone must not create match inputs. An approved summary may contribute to matching only through explicitly confirmed broad tags that have per-tag confirmation records for the current source-summary version and allowed-field policy.
- Expired, rejected, or revoked summaries must not influence matching.
- Expiration, rejection, revocation, or removal of a confirmed tag must mark dependent active briefs as `stale` and block intro creation from those briefs until recomputed from valid inputs.

## `POST /api/background/source-summaries/:id/confirm-tags`

Auth required.

Confirms, narrows, or revokes specific source-summary-derived broad tags for matching.

Requirements:

- Require the source summary to be owned by the participant, unexpired, unrejected, unrevoked, and at least approved or pending-review under the repository's chosen review workflow.
- Accept only a server-known list of proposed tags or participant-entered broad tags that pass the same schema and allowed-field validation.
- Reject confirmation of tags derived from private third-party data unless the tag has been redacted into the participant's own broad wish/offer/capability or non-sensitive public context, or the relevant third party independently confirms it through their own profile/exposure settings.
- Display or return every tag and allowed-field key being confirmed; do not allow silent bulk confirmation of hidden or model-generated tags.
- Store per-tag confirmation records tied to the current `source_summary_version`, allowed-field policy, and confirmation actor.
- Moving a tag into `confirmed_broad_tags` must be an explicit participant action; source-summary approval, file import, LLM synthesis, or operator review must not silently confirm tags for matching.
- Revoking or changing a confirmed tag removes future matching influence and marks dependent active briefs stale.

## `POST /api/background/delegate-runs`

Auth required.

Feature flag: `BACKGROUND_DELEGATE_RUNS_ENABLED`.

Enqueues a helper run for one of:

- saved search
- profile update
- approved summary
- scheduled digest
- manual scan

Requirements:

- Require an active, unexpired delegate authorization.
- Require exactly one requested `purpose_code`; it must be present in the authorization's `allowed_purpose_bindings`, and the selected `{purpose_code, purpose_policy_version}` pair must still be valid in the current purpose-code registry. Enforce that selected purpose code, selected purpose-policy version, allowed surfaces, audience/cohort scope, maximum candidates, and maximum briefs from the authorization. Do not run all authorized purpose codes in one helper job.
- For any non-staff or external-pilot run, require a current approved `background_rollout_risk_review` covering the exact purpose code, purpose-policy version, surfaces, and audience/cohort scope. Missing, expired, revoked, blocked, wrong-version, wrong-surface, or wrong-cohort reviews must fail closed with no run and no candidate surfacing.
- Apply rate limits.
- Enforce the minimum eligible-pool floor and anti-probing checks before scoring.
- If no privacy-safe opportunity is created, return only a generic queued/completed/no-brief state. Do not expose immediate no-match reasons, exact completion timing, exact withheld counts, receipt sequence changes, or candidate-specific gate signals; where user-facing status is needed, use fixed digest windows or jittered/rate-limited generic status.
- Create a redacted delegate-run receipt.
- Return `429 Too Many Requests` with `Retry-After` when throttled.

## `GET /api/background/opportunity-briefs`

Auth required.

Feature flag: `BACKGROUND_OPPORTUNITY_BRIEFS_ENABLED`.

Returns only briefs belonging to the authenticated participant.

Requirements:

- Build the response from the sanitized opportunity-brief projection or server-side DTO, not by returning the internal `background_opportunity_briefs` row shape.
- Do not use `select *`, schema spreading, generic JSON serialization, debug serialization, or ORM entity passthrough from the internal brief table in requester-facing routes.
- Internal-only candidate identifiers, candidate-dependency snapshots, exact blocker states, exact timing fields, and retention/anonymization causes must be absent from the response object before logging, telemetry, caching, or rendering.
- Validate the response object against the versioned requester-facing output schema before logging, telemetry, caching, or rendering. Extra keys must fail closed in tests and be stripped or rejected in production according to the repository’s API policy.

Response must include:

- `visible_headline`
- `confidence_band`
- `factor_codes`
- `blocker_codes`, limited to generic requester-safe categories where a blocker would otherwise reveal candidate-specific consent, budget, cohort, retention, or privacy-stage state
- `safety_blocker_codes` when nonempty, limited to generic requester-safe categories where needed to prevent candidate-specific inference
- `redacted_fields`
- `visible_counts`, bucketed or withheld whenever exact counts could reveal sparse pools or candidate-specific gate outcomes
- scanned surfaces/provenance labels such as `broad_profile`, `approved_source_summary`, or `saved_search`
- authorization scope summary
- purpose label
- dependency-state label
- receipt id for the redacted delegate receipt
- allowed actions

Response must not include:

- exact wishes
- source notes
- contact details
- sensitive constraints
- raw profile notes
- protected traits
- ideology/psychology inferences
- private messages
- hidden preferences
- candidate-specific blocker reasons or gate states, including opt-out, budget exhaustion, cool-off, cohort membership, privacy-stage conflict, retention state, prior dismissal/report, or third-party-data block
- internal candidate-dependency snapshot fields, including candidate opt-in, discoverability, exposure-version, inbound-discovery, budget-version, cohort-membership, retention/anonymization, or candidate-specific stale-cause fields
- exact candidate identity before the relevant disclosure stage

## `POST /api/background/opportunity-briefs/:id/feedback`

Auth required.

Accepts:

- `interested`
- `dismissed`
- `maybe_later`
- `report`

Requirements:

- Revalidate the opportunity brief’s authorization, purpose code, purpose-policy version, profile-version, source-summary, candidate-exposure, candidate-discoverability, cohort-scope, emergency-stop state, and expiry dependencies before accepting feedback.
- If the brief is stale, return a non-destructive `409` or equivalent stale-state response with no disclosure and no intro request.
- If the brief's candidate reference is already `redacted` or `anonymized`, reject feedback advancement with no disclosure and no intro request.
- If `dismissed`, `maybe_later`, or `report`, apply the configured cool-off and retention lifecycle; do not keep linkable candidate references longer than needed for participant review or safety review.
- If `interested` and the brief remains valid, create or advance an intro request, but do not disclose counterparty details.
- Create a redacted receipt for `intro_request_created`.

## `POST /api/background/intro-requests`

Auth required.

Creates a reviewed introduction request.

Requirements:

- Operator queue remains required.
- Contact disclosure requires mutual consent.
- Contact disclosure requires step-up auth if the existing system has step-up auth.
- Intro requests from stale opportunity briefs must be rejected without disclosure.
- `purpose_code` and `purpose_policy_version` must be inherited from the valid opportunity brief's snapshots; do not allow free-form purpose overrides or registry-version substitution during intro creation.
- Counterparty-facing notification or contact may occur only after operator review determines the request is eligible for the relevant consent step.

## `GET /api/background/delegate-receipts`

Auth required.

Returns participant-visible, redacted receipts for delegate runs, opportunity-brief creation, stale transitions, and intro-request creation.

Requirements:

- Return only receipts owned by the authenticated participant.
- Do not expose raw source text, exact wishes, exact candidate identity, private cohort membership, prompts, message text, or private notes.
- Provide enough redacted information for the user to understand why a delegate run or opportunity brief exists and which authorization scope it used.
- Hide, delete, or anonymize receipts after their retention window unless a safety-review or legally required hold applies.


## `POST /api/background/admin-safety-actions`

Internal/operator auth required.

Creates a redacted admin safety action for suppression, quarantine, stale marking, intro-review approval, risk-review revocation, purpose-code disabling, or retention-hold management.

Requirements:

- This endpoint is not a consent, matching, or disclosure endpoint.
- It must not widen authorization, candidate exposure, audience scope, surfaces, purpose codes, or disclosure fields.
- It must not mark stale artifacts valid, reverse anonymization, repopulate candidate/counterparty identifiers, bypass risk-review requirements, bypass minimum eligible-pool floors, or allow latent/embedding-based matching.
- `approve_intro_review` may only be accepted if the referenced intro request inherits a valid brief, all non-waivable hard gates pass, operator review is required for that purpose/risk tier, and no candidate/counterparty details are disclosed by this endpoint itself.
- Break-glass actions must be limited to suppression, quarantine, revocation, retention hold/release, or blocking. They must require a reason code, redacted summary, actor identity, and hard-gate snapshot.
- All responses must be redacted and must not expose exact wishes, source notes, private cohort membership, candidate identities, prompts, message text, hidden abuse heuristics, or sensitive admin notes.


## `POST /api/background/retention-holds`

Internal/operator or legal-owner auth required.

Creates, narrows, renews, releases, or expires a time-bounded retention hold.

Requirements:

- This endpoint controls delayed cleanup only; it must not create consent, widen authorization, widen candidate exposure, surface candidates, send notifications, disclose details, unredact artifacts, repopulate candidate/counterparty identifiers, reverse anonymization, or make stale artifacts actionable.
- Require a hold kind, scope, owner, reason code, redacted summary, allowed retained field keys, review date, and expiry date except where a legal hold policy explicitly requires otherwise.
- Non-legal holds must be finite and must not be renewed without fresh justification. Broad holds over a cohort, purpose, surface, retention class, or global scope require operator approval and a current incident/risk-review basis.
- Held artifacts may be used only for the stated safety, abuse-prevention, incident-response, dispute, or legal review. They must be excluded from matching, notifications, feedback advancement, intro requests, disclosure grants, analytics exports, and public reports.
- Release or expiry must enqueue idempotent retention cleanup and must not automatically reactivate runs, briefs, feedback, or intro requests.
- Responses must be redacted and must not expose exact wishes, source notes, private cohort membership, candidate identities, prompts, message text, legal strategy, hidden abuse heuristics, or sensitive admin notes.


## `POST /api/background/emergency-controls`

Internal/operator auth required.

Activates, narrows, expires, or releases a scoped emergency stop.

Requirements:

- This endpoint is for containment only; it must not create consent, widen authorization, widen candidate exposure, surface candidates, disclose details, unredact artifacts, or make stale artifacts actionable.
- Active controls may be global or scoped by purpose code, purpose-policy version, surface, audience scope, cohort, notification path, LLM mode, or retention class.
- Activation must cancel or pause matching work in scope, suppress in-scope notifications, block new candidate surfacing and intro advancement, and mark dependent active artifacts stale or emergency-paused.
- Release must require a redacted reason, actor identity, and safety summary; release must not automatically resume runs or re-enable stale artifacts. Recompute from currently valid inputs is required.
- Responses must be redacted and must not expose exact wishes, source notes, private cohort membership, candidate identities, prompts, message text, hidden abuse heuristics, or sensitive admin notes.


## `POST /api/background/runtime-safety-tripwires`

Internal/operator auth required.

Creates, updates, pauses, disables, or tests runtime safety tripwires.

Requirements:

- This endpoint configures containment detection only; it must not create consent, widen authorization, widen candidate exposure, surface candidates, disclose details, unredact artifacts, or make stale artifacts actionable.
- Blocking tripwires for known non-waivable gate failures must activate the narrowest applicable emergency control or pause the affected lane when triggered.
- The endpoint must require an explicit signal-trust class, maximum automatic scope, and corroboration rule. It must reject configurations that let user-controllable aggregate signals alone trigger global stops, public-broad-preview stops, whole-purpose stops, whole-cohort stops, candidate exposure revocation, or broad deplatforming.
- Review-only tripwires may create an operator-review task from redacted aggregate signals, but they must not permit new surfacing when their configured severity is blocking.
- Tripwire configuration, dry-runs, trigger logs, and responses must be redacted and must not expose exact wishes, source notes, private cohort membership, candidate identities, prompts, message text, hidden abuse heuristics, embeddings, latent vectors, or sensitive admin notes.
- Feature flags, fixtures, admin actions, and break-glass paths must not bypass active blocking tripwires.


---

# Matching algorithm

Implement deterministic matching only. The delegate may create an opportunity brief but must not rank people globally or mutate disclosure state.

## Eligibility preconditions

All of the following must hold:

- `participant.opt_in_status == active`.
- A referenced delegate authorization is active, unexpired, unrevoked, and owned by the participant.
- The run specifies exactly one allowlisted `{purpose_code, purpose_policy_version}` pair from the authorization's per-purpose bindings and stays inside the authorization’s allowed purpose codes, allowed purpose-policy bindings, allowed surfaces, audience/cohort scope, maximum candidates, maximum briefs, and minimum confidence band.
- For non-staff or external-pilot contexts, the run is covered by a current approved risk review for the exact purpose code, purpose-policy version, surfaces, and audience/cohort scope.
- No active emergency stop applies to the global system, selected purpose code, purpose-policy version, selected surfaces, audience/cohort scope, notification path, LLM mode, or relevant retention class. Active emergency controls are hard blockers before run creation, scoring, notification, opportunity-brief creation, feedback advancement, candidate-facing exposure, or intro-request creation.
- No active blocking runtime safety tripwire applies to the selected purpose code, purpose-policy version, surfaces, audience/cohort scope, notification path, LLM mode, retention class, explicit-signal path, or relevant hard-gate family. Blocking tripwires are hard blockers before run creation, scoring, notification, opportunity-brief creation, feedback advancement, candidate-facing exposure, or intro-request creation. Any active tripwire that was triggered only by user-controllable aggregate signals must also satisfy its anti-DoS corroboration and maximum-scope rules before it can create a broad emergency stop; otherwise it may only trigger review, narrow throttling, or the smallest affected-lane pause.
- No operator/admin action, feature flag, fixture, or break-glass state claims to waive any non-waivable gate. Operator/admin actions may only narrow, suppress, quarantine, mark stale, or approve a next step after all hard gates pass.
- The participant's profile version is current and `last_confirmed_at` is inside the repository-defined freshness window, unless the participant has explicitly marked the relevant fields current for this run.
- The authorized search pool passes the repository-defined minimum eligible-pool floor before candidate scoring. Use a default floor of at least 5 eligible broad-preview candidates unless the repository already has a stricter anti-enumeration constant.
- Candidate profile is currently active, not paused, not deleted, and discoverable at `broad_preview` or compatible privacy stage.
- Candidate-side `inbound_delegate_discovery`, `inbound_delegate_purpose_codes`, `inbound_delegate_purpose_bindings`, `inbound_delegate_surfaces`, `allowed_cohort_ids`, and `candidate_exposure_version` authorize this requesting delegate's selected purpose code, selected purpose-policy version, audience scope, cohort, and allowed surfaces.
- Candidate-side surfacing budget, pending-intro budget, cool-off state, and `candidate_inbound_budget_version` authorize another surfacing or intro path for this selected purpose, audience scope, and cohort. Exhausted budgets, missing required budget settings, stale budget versions, or active cool-offs are hard blockers.
- Candidate-side budget authorization and counter reservation/increment succeed atomically for this surfacing or intro path. If the atomic budget update fails, races, conflicts, or detects a stale counter version, the candidate is treated as budget-blocked with no opportunity-brief creation and no notification.
- Candidate is inside the authorized cohort, partner-matchmaker scope, or public-broad-preview scope explicitly allowed for this run.
- Candidate is not the same participant.
- No stated exclusion conflict.
- No safety/prohibited-pattern blocker.
- No prohibited-coordination blocker, including collusion, price-fixing, fraud, harassment, intimidation, doxxing, extortion, sanctions evasion, or coercion.
- No sparse-search or anti-enumeration blocker.
- Privacy stages are compatible.
- Both sides’ broad signals are within retention and revocation constraints.
- Every match input is an explicit, participant-visible, schema-bound field or confirmed broad tag; hidden embeddings, latent vectors, unreviewed model summaries, private source-derived representations, or uninspectable features are hard blockers.
- No match input is derived from private third-party data supplied by someone other than the person being represented. Third-party wishes, constraints, capabilities, vulnerabilities, affiliations, contact details, or strategy can influence discovery only through that third party's own independently confirmed profile and exposure settings.
- Any source-summary or interview-derived field used for positive scoring is explicitly confirmed, not merely uncertain or machine-proposed.
- The candidate has not been repeatedly surfaced to this participant through materially equivalent query/profile variants beyond the repository’s dedupe window.
- Candidate is not within a cool-off window from prior dismissal, report, or operator block.
- The relevant run, source summary, opportunity brief, and receipt artifacts are inside their retention windows and are not already anonymized. Artifacts retained only because of an active retention hold must not be used for matching, notifications, feedback advancement, intro requests, disclosure grants, or opportunity-brief creation; they are available only for the hold's stated safety/legal review purpose.

## Factor codes

Use only approved public factor-code strings from the repository’s match-signal contract unless this task also updates that contract and all validator tests. The current public-compatible baseline is:

- `cause_area_overlap`
- `cause_area_complementarity`
- `trade_mode_compatible`
- `verification_preference_compatible`
- `location_constraint_satisfied`
- `privacy_safe_preview`
- `privacy_stage_compatible`
- `stated_exclusions_clear`
- `human_review_required`

Internal scoring may use additional local components such as offer/ask complementarity, availability compatibility, capped confirmed-signal sufficiency, or source-summary provenance, but do not emit new public factor-code strings such as `offer_ask_complementarity`, `availability_compatible`, or `coarse_location_compatible` unless the contract allowlist and tests are updated in the same change.

## Score function

Use this only to create local opportunity briefs. Never expose this as a public person ranking.

```text
score =
  25 * causeAreaOverlap01
+ 25 * offerAskComplementarity01
+ 15 * tradeModeCompatible01
+ 10 * verificationCompatible01
+ 10 * availabilityCompatible01
+  5 * coarseLocationCompatible01
+ 10 * confirmedSignalSufficiency01
- 40 * anySoftSafetyConcern01
-100 * anyHardBlocker01
```

`confirmedSignalSufficiency01` is a capped binary-or-saturating measure that the run has enough explicitly confirmed, broad, purpose-compatible signals to support the match. It must saturate once the minimum safe evidence threshold is met. It must not increase merely because the participant provides more private detail, more source summaries, more free text, more confirmed tags, more retained history, or more source variety.

Where `anyHardBlocker01` must include prohibited-coordination blockers, purpose-mismatch or purpose-policy-version blockers, missing/expired/revoked/wrong-scope risk-review blockers for external use, active emergency-stop blockers, active blocking runtime-tripwire blockers, authorization-scope violations, candidate-exposure violations, candidate-side budget exhaustion, stale/non-atomic budget counter updates, or cool-off states, candidate opt-out/pause/delete states, privacy-stage violations, sparse-search or minimum-pool blockers, repeated-probe blockers, stale dependency snapshots, retention-expired, retention-held-only, or anonymized artifacts, revoked-source influence, unconfirmed uncertainty driving positive score, hidden embedding or latent-vector influence, operator/admin override attempts, and safety/operator blocks. A hard blocker must suppress opportunity creation regardless of score.

## Bands

| Band | Rule |
|---|---|
| `high` | `score >= 70` and no blocker |
| `medium` | `score >= 50` and no blocker |
| `low` | `score >= 35` and no blocker |
| `blocked` | any hard blocker |

Create opportunity briefs only for `medium` or `high` matches unless the user explicitly requests manual scan diagnostics. Do not notify for `low` matches by default.

---

# Opportunity brief content

Each brief must show:

- generic headline
- confidence band
- reason/factor codes
- visible counts bucketed by policy, not exact values where sensitive, sparse, or tied to candidate-specific gate outcomes
- redacted fields list
- scanned surfaces, such as:
  - `broad_profile`
  - `approved_source_summary`
  - `saved_search`
- blockers or review gates, using generic requester-safe categories when exact blocker reasons would reveal candidate-specific consent, budget, cohort, retention, or privacy-stage state
- authorization scope summary, such as cohort or partner-matchmaker scope
- purpose label
- dependency-state summary, such as `valid`, `stale`, or `recompute_required`
- redacted receipt id
- safety status, limited to coarse safe/blocked/review-required labels
- available actions:
  - dismiss
  - maybe later
  - report
  - request intro

Each brief must never show:

- exact private wishes
- contact details
- sensitive constraints
- raw profile notes
- raw source notes
- protected traits
- ideology/psychology inferences
- hidden preferences
- exact counterparty strategy
- exact counterparty identity before the relevant disclosure stage
- unapproved source-derived text
- exact eligible-pool size when the pool is sparse
- candidate-specific blocker reasons such as opt-out, exposure mismatch, budget exhaustion, cool-off, cohort membership, privacy-stage conflict, retention/anonymization state, prior dismissal/report, or third-party-data block

Stale-brief behavior:

- A stale brief may be shown only as historical context with disabled actions and a requester-safe stale reason. If the stale cause is candidate-specific, the reason must be generic, such as `stale_or_unavailable` or `recompute_required`, rather than exposing the exact dependency that changed.
- A stale brief must not trigger notifications, intro requests, disclosure grants, contact disclosure, ranking changes, or additional matching effects.
- After the participant-visible review window and any safety-review hold, stale or closed briefs must delete or anonymize linkable candidate references and free-text content.
- Recompute from currently valid inputs is required before any action can resume.

---

# Notification policy

Implement or update the notification builder.

Required copy:

```ts
export const BACKGROUND_OPPORTUNITY_NOTIFICATION = {
  title: "New broad-overlap opportunity",
  body: "A privacy-safe opportunity brief is ready for your review. Exact wishes and contact details remain hidden until the appropriate consent stage.",
};
```

The notification builder must have an explicit `recipient_role` or equivalent guard. For opportunity-brief creation, the only valid recipient is the participant whose delegate created the brief. Candidate-facing messages are valid only for a separate intro-consent flow after operator review.

Notification body must be invariant-tested so it never includes:

- exact wishes
- contact details
- source notes
- private constraints
- raw text
- payment details
- message text

---

# AI / wish interview constraints

If an LLM is used:

- It can propose fields only.
- It cannot directly change the profile.
- It cannot directly create match suggestions.
- It cannot change ranking.
- It cannot contact counterparties.
- It cannot bypass review.
- It must output JSON validated by a strict schema.
- It must use a no-training/no-retention provider mode, a tenant-isolated enterprise mode with equivalent retention guarantees, or a local model. If none is available, the LLM path must fail closed and the deterministic/manual path must remain usable.
- It must send the minimum necessary user text for the immediate proposal, not full source exports, unrelated chat history, raw email/calendar bodies, or prior hidden transcripts.
- It should prefer `uncertainty_flags` and `unanswered_fields` over guessing.
- It must mark unconfirmed proposed fields so deterministic matching cannot give them positive weight until explicit participant confirmation.
- It must treat user-provided source text, URLs, exports, and chat history as untrusted data and ignore instructions embedded in them.
- It must store no hidden reasoning transcript.
- It must not store or emit private embeddings, latent preference vectors, hidden desire profiles, or other uninspectable features for matching. Any LLM output that may affect matching must be converted into schema-bound field proposals and explicitly applied by the participant before use.

Suggested Zod schema:

```ts
import { z } from "zod";

export const WishProposalSchema = z.object({
  causeAreas: z.array(z.string()).max(12).default([]),
  offeredResources: z.array(z.string()).max(20).default([]),
  requestedResources: z.array(z.string()).max(20).default([]),
  capabilities: z.array(z.string()).max(20).default([]),
  constraints: z.array(z.string()).max(20).default([]),
  tradeModes: z.array(z.string()).max(12).default([]), // refine to existing trade-mode enum
  verificationPreferences: z.array(z.string()).max(10).default([]),
  coarseAvailability: z.array(z.string()).max(10).default([]),
  coarseLocation: z.string().max(64).optional(),
  statedExclusions: z.array(z.string()).max(12).default([]),
  uncertaintyFlags: z.array(z.string()).max(12).default([]),
  unansweredFields: z.array(z.string()).max(12).default([]),
  participantExplanation: z.array(z.string()).max(12).default([]),
});
```

---

# Dashboard UI

Add or update a Background Delegate dashboard surface with four panels.

## 1. Delegate status

Include:

- opt in / pause / disable
- active delegate authorization summary
- inbound candidate-exposure status, budget status, pending-intro limit, cool-off state, and controls for this user's own profile
- allowed purpose codes, allowed surfaces, and audience/cohort scope
- maximum runs / briefs / candidates and expiry window
- revoke authorization
- last helper run
- next scheduled digest
- rate-limit, anti-probing, stale-brief, or privacy-gate status
- recent redacted delegate receipts
- artifact retention and cleanup status for runs, briefs, feedback, intro requests, and receipts

## 2. Wish profile composer

Include:

- structured fields
- optional fluent interview if enabled
- preview of broad fields
- explicit **Apply** button
- explicit “do not use this for matching” draft state

## 3. Source summaries

Include:

- add manual source summary
- review derived broad tags
- distinguish summary approval from tag confirmation
- confirm individual proposed broad tags or explicitly displayed batches of broad tags
- revoke individual tag confirmations
- choose allowed field keys
- choose retention window:
  - 30 days
  - 90 days
  - 180 days
  - 365 days
- approve
- reject
- revoke
- visible no-raw-feed-mining notice
- visible third-party-private-data review/redaction status

## 4. Opportunity inbox

Include:

- list opportunity briefs
- confidence band and factor codes
- redacted fields
- dependency-state label and stale-recompute notice when relevant
- receipt id / receipt detail link
- dismiss
- maybe later
- report
- request intro
- explanation that a suggestion is not an introduction

---

# Accessibility

All dashboard flows must be keyboard navigable and screen-reader labelled:

- opt-in toggle
- delegate authorization controls
- cohort/audience-scope controls
- source-retention controls
- approve/reject buttons
- opportunity actions
- redaction notices
- consent dialogs
- deletion/revocation controls
- stale-brief notices and recompute controls
- delegate receipt history
- retention/cleanup status notices

---

# Telemetry

Only record aggregate, privacy-safe event metadata.

## Allowed event names

- `background_delegate_authorization_created`
- `background_delegate_authorization_revoked`
- `background_candidate_exposure_updated`
- `background_candidate_exposure_revoked`
- `background_candidate_exposure_budget_exhausted`
- `background_delegate_run_created`
- `background_delegate_run_withheld_for_minimum_pool`
- `background_opportunity_brief_created`
- `background_opportunity_brief_marked_stale`
- `background_opportunity_brief_viewed`
- `background_opportunity_feedback_submitted`
- `background_intro_request_created`
- `background_source_summary_approved`
- `background_source_summary_revoked`
- `background_safety_blocker_triggered`
- `background_artifact_anonymized`
- `background_emergency_control_activated`
- `background_emergency_control_released`
- `background_runtime_tripwire_triggered`
- `background_runtime_tripwire_resolved`

## Allowed metadata

- coarse route family
- stage
- confidence band
- factor-code counts, bucketed/generic only when requester-visible or exportable
- blocker-code counts, bucketed/generic only when requester-visible or exportable
- feature flag state
- authorization state
- broad purpose code
- purpose-policy version
- broad audience-scope type, not exact private cohort membership if sensitive
- latency bucket
- outcome state
- dependency-state label
- retention-state label
- candidate budget-state label only in candidate-owned views or internal service/safety telemetry; requester-visible, exportable, or public surfaces may use only generic availability/budget categories that are bucketed, withheld, or aggregated over a sufficiently broad safe pool
- eligible-pool-size bucket, never exact sparse pool size

## Forbidden telemetry

- exact wishes
- raw search text
- source notes
- private constraints
- contact details
- emails
- prompts
- message text
- private third-party identifiers, wishes, constraints, vulnerabilities, affiliations, capabilities, strategy, or contact details
- raw receipt payloads
- embeddings, latent vectors, hidden preference profiles, or unreviewed model-derived representations
- emergency-control sensitive details, hidden abuse heuristics, and private incident-response notes
- runtime-tripwire sensitive details, exact trigger payloads, hidden abuse heuristics, and private incident-response notes
- free-text purpose descriptions when sensitive
- deprecated or internal-only purpose registry notes
- receipt hashes when linkable to private events outside participant-facing receipt UI
- exact private cohort membership when sensitive
- counterparty-specific sensitive details
- candidate-specific budget-state labels such as `clear`, `near_limit`, `exhausted`, or `cooloff` in requester-visible, exportable, or public telemetry unless they are mapped to generic availability/budget categories and aggregated over a sufficiently broad safe pool
- exact no-result, no-brief, withheld, low-confidence, blocked-run, digest-delta, receipt-sequence, queue-timing, retry-timing, or notification-absence signals that could let a requester infer candidate existence or candidate-specific gate outcomes

---

# Testing requirements

Add or update tests. At minimum:

## `background-delegate-authorizations.test.ts`

Verify:

- delegate runs require an active, unexpired authorization
- revoked or expired authorizations cancel pending runs and prevent new briefs
- global cross-registry scope is rejected unless `BACKGROUND_GLOBAL_DELEGATE_RUNS_ENABLED=true` and operator rollout approval exists
- run budgets, brief budgets, candidate limits, allowed purpose codes, purpose-policy versions, and minimum confidence bands are enforced
- broad catch-all delegate purposes, user-defined purpose codes, deprecated purpose codes, and silent semantic reinterpretations are rejected
- authorization summaries are understandable and do not expose private source text
- revocation marks dependent active briefs stale and disables actions

## `background-explicit-signal-matching.test.ts`

Verify:

- eligibility, scoring, opportunity-brief creation, notifications, feedback advancement, and intro requests use only participant-visible, schema-bound, explicitly confirmed broad fields and tags
- hidden embeddings, latent vectors, unreviewed model summaries, private source-derived representations, and uninspectable derived features cannot influence matching or surfacing
- source-summary `unconfirmed_derived_tags`, any legacy `derived_broad_tags`, and wish-interview proposals remain proposal-only until explicitly confirmed
- source-summary approval without per-tag confirmation is insufficient for eligibility, scoring, opportunity-brief creation, notifications, feedback advancement, or intro requests
- additional private detail, source-summary volume, free text, confirmed tag count, retained history, or source variety does not increase score once confirmed-signal sufficiency is met
- no vector column, embedding cache, model side table, or analytics feature store is read by the deterministic matching path
- deleting or revoking a source summary removes all confirmed broad-tag influence and leaves no latent representation that can continue influencing matches

## `background-delegate-matching.test.ts`

Verify:

- creates opportunity only when eligibility passes
- high/medium/low/blocked bands are deterministic
- no profile with privacy conflict is matched
- stated exclusions block suggestions
- exact wish fields are not returned
- public factor codes match the repository’s match-signal contract allowlist
- authorization-purpose mismatches, authorization-scope violations, and prohibited-coordination blockers suppress brief creation
- candidate-side purpose/exposure violations, paused/deleted candidate profiles, and out-of-cohort candidate settings suppress brief creation
- minimum eligible-pool failure and repeated-probe detection suppress brief creation
- unconfirmed uncertainty flags cannot add positive score

## `background-source-summaries.test.ts`

Verify:

- `raw_ingestion_allowed` defaults false
- source-summary approval alone does not make any proposed tag or allowed field usable for matching
- source summaries that contain private third-party data are marked `needs_review` or `contains_private_third_party_data` and cannot generate matchable tags from that material
- third-party-derived wishes, constraints, capabilities, vulnerabilities, affiliations, contact details, or strategy cannot influence matching unless represented through that third party's own independently confirmed profile/exposure settings
- approved summary can influence only allowed and explicitly confirmed broad fields
- tag confirmation records are tied to the current source-summary version and allowed-field policy
- revoking or changing a tag confirmation removes future matching influence and marks dependent active briefs stale
- unconfirmed derived tags, any legacy `derived_broad_tags`, embeddings, latent vectors, and unreviewed model summaries cannot influence matching
- rejected, expired, or revoked summary cannot influence matching
- source summary ciphertext/version fields are required
- analytics receives no raw source text
- prompt-injection text inside a source summary cannot alter matching policy, feature flags, or disclosure behavior
- source summary revocation or expiry marks dependent active briefs stale and blocks intro creation until recompute

## `background-third-party-data-minimization.test.ts`

Verify:

- imported source text, calendar/email excerpts, public URL summaries, chatbot history, and manual notes containing private third-party data are marked for redaction/review and cannot create matchable tags from that material
- participant confirmation can make only participant-owned wishes/offers/capabilities or non-sensitive public context matchable; it cannot confirm another person's private wishes, constraints, vulnerabilities, affiliations, capabilities, strategy, or contact details
- third-party participation requires that third party's own independently confirmed profile and candidate-exposure settings
- redacted summaries preserve only broad non-sensitive context and never expose third-party private details in telemetry, receipts, opportunity briefs, notifications, or tests
- revoking a third-party redaction decision or discovering unredacted private third-party data marks dependent active briefs stale and blocks intro advancement until recompute

## `background-wish-interview.test.ts`

Verify:

- model proposal cannot mutate live profile before explicit apply
- invalid output causes no state change
- protected-trait, ideology, psychology, and hidden-preference fields are rejected
- uncertainty flags are preserved
- unconfirmed proposed fields are stored as draft/uncertain and cannot add positive matching weight
- LLM outputs cannot create hidden embeddings, latent preference vectors, or uninspectable matching features
- prompt-injection attempts in user messages or imported context cannot bypass schemas, mutate live state, or alter ranking
- LLM calls use no-training/no-retention, tenant-isolated equivalent, or local-model mode; otherwise the LLM path fails closed
- LLM calls send only the minimum necessary text and never full raw source exports or unrelated chat history

## `background-opportunity-briefs.test.ts`

Verify:

- response excludes exact wishes, contact details, source notes, sensitive constraints, raw notes, protected traits, and ideology/psychology inferences
- brief contains factor codes, redacted fields, confidence band, and allowed actions
- feedback `interested` creates intro request without contact disclosure
- redacted internal opportunity-brief creation after all hard gates pass does not require operator review, but cannot disclose exact details, contact counterparties, create reliance obligations, or make counterparty-facing state changes
- candidate exact identity and exact private wishes remain hidden until the relevant consent stage
- stale briefs are returned only with disabled actions or are withheld; feedback on stale briefs cannot create intro requests
- visible counts are bucketed and sparse exact pool sizes are never returned
- requester-facing blocker codes and diagnostics map candidate-specific consent, budget, cohort, retention, and privacy-stage failures to generic categories without revealing the exact candidate-specific reason
- requester-facing factor/blocker counts and diagnostics are bucketed, suppressed, or aggregated so exact candidate-specific gate counts cannot be inferred
- candidate-dependency snapshot fields such as candidate opt-in, discoverability, exposure version, inbound discovery, budget version, cohort membership, retention/anonymization, and candidate-specific stale causes are internal-only and never appear in requester-facing APIs, receipts, exports, notifications, diagnostics, telemetry, or stale-brief explanations
- requester-facing opportunity-brief routes use the sanitized projection/DTO and cannot accidentally serialize internal `background_opportunity_briefs` rows, including through `select *`, ORM entity passthrough, debug fields, caching, telemetry, or export helpers
- requester-facing opportunity-brief response schemas are exact allowlists: newly added internal columns, unknown keys, ORM relations, debug metadata, and spread fields are rejected or stripped before logging, caching, telemetry, rendering, exports, or network response

## `background-brief-staleness.test.ts`

Verify:

- changing authorization status, profile version, source-summary status, candidate opt-in status, candidate exposure version, candidate discoverability, cohort scope, or brief expiry marks dependent active briefs stale
- stale briefs do not trigger notifications, intro requests, disclosure grants, contact disclosure, or ranking changes
- stale-state responses are non-destructive and reveal no new counterparty details
- candidate-specific stale causes are mapped to generic requester-safe labels and do not reveal opt-out, budget exhaustion, cool-off, cohort changes, privacy-stage changes, retention/anonymization, or exposure-setting changes
- recompute creates a new brief only from currently valid dependencies and emits a new receipt

## `background-notification-policy.test.ts`

Verify:

- notification copy is generic
- notification suppresses exact wishes, contact details, source notes, private constraints, and message text
- unsafe email outbox rows cannot be sent
- opportunity-brief creation cannot enqueue candidate-facing notifications
- candidate-facing notification is possible only through an intro-consent flow after operator review

## `background-rate-limit.test.ts`

Verify:

- helper-run creation is rate limited
- `429` includes `Retry-After`
- retries use capped exponential backoff with jitter if there are workers

## `background-anti-probing.test.ts`

Verify:

- delegate runs below the minimum eligible-pool floor are withheld or broadened
- materially equivalent query/profile variants cannot repeatedly test for the same candidate
- visible count outputs are bucketed and never expose sparse exact counts
- candidate-specific blockers such as opt-out, budget exhaustion, cool-off, cohort mismatch, privacy state, retention state, or prior dismissal/report are not exposed to requesters as exact blocker reasons
- exact counts or count deltas for genericized candidate-specific blocker categories are not exposed to requesters through briefs, receipts, diagnostics, telemetry, or API responses
- no-result, no-brief, withheld, blocked-run, receipt-timing, queue-timing, digest-delta, retry-timing, and notification-absence behavior does not let requesters distinguish candidate absence from candidate-specific gates
- anti-probing blockers override otherwise high scores

## `background-privacy-controls.test.ts`

Verify:

- RLS prevents cross-participant reads
- deletion removes background-layer records except redacted/anonymized audit records where policy permits
- revocation stops future source influence and future helper runs
- delegate authorization revocation stops pending and future runs under that authorization
- stale dependency snapshots suppress active brief display, notifications, feedback advancement, and intro creation
- candidate-side exposure revocation marks dependent active briefs stale and prevents new candidate surfacing
- candidate-dependency snapshots are protected as internal-only fields under RLS/service-role access and are redacted/coarsened during artifact redaction or anonymization
- ordinary authenticated users cannot read internal-only opportunity-brief columns for participant-owned rows; tests cover database grants/RLS, sanitized views, API serializers, receipts, exports, and debug endpoints
- static or contract tests prevent requester-facing routes, receipts, telemetry builders, cache serializers, exports, and client hydration code from importing internal row types or using schema-spread/`select *` patterns instead of the versioned sanitized output schemas

## `background-delegate-receipts.test.ts`

Verify:

- delegate runs, opportunity-brief creation, stale transitions, and intro-request creation create redacted receipts
- receipts are participant-scoped under RLS
- receipt factor/blocker aggregates and any budget-state information are bucketed, suppressed, or genericized where exact counts or labels could reveal candidate-specific gates
- receipt payloads exclude raw source text, exact wishes, exact candidate identity, private cohort membership, prompts, message text, and private notes
- receipt hashes or sequence values cannot be used through telemetry to infer private events outside the participant-facing receipt UI

## `background-cohort-scoping.test.ts`

Verify:

- cohort-only authorizations search only profiles in the allowed cohort or pilot scope
- partner-matchmaker authorizations respect the partner-approved audience boundary
- public-broad-preview runs require the global delegate flag and operator rollout approval
- opportunity briefs include only broad scope labels, not sensitive cohort membership details

## `background-candidate-exposure.test.ts`

Verify:

- candidate profiles with `opt_in_status` off, paused, deleted, owner-only, imported-without-confirmation, migrated-without-confirmation, or privacy-reset-without-confirmation are not scored or surfaced
- new, imported, migrated, reactivated, and privacy-reset profiles default to `inbound_delegate_discovery = off` and `inbound_delegate_surfaces = {}`
- ordinary `discoverability_scope` updates do not create, widen, or re-enable inbound delegate discovery
- candidate `inbound_delegate_discovery` cannot be broader than `discoverability_scope`
- candidate `inbound_delegate_purpose_codes` and per-purpose `inbound_delegate_purpose_bindings` must be separately confirmed, nonempty for non-`off` exposure, version-compatible, and purpose-compatible with the requesting delegate
- public-broad-preview inbound delegate discovery requires the global delegate flag and operator rollout approval
- candidate allowed-cohort settings are enforced before scoring and before opportunity-brief display
- changing candidate exposure purpose codes, purpose-policy version, or other exposure settings updates `candidate_exposure_version` and marks dependent active briefs stale
- candidate inbound surfacing budgets, pending-intro limits, cool-off state, and budget-version checks are enforced before scoring, surfacing, opportunity-brief display, feedback advancement, and intro-request creation
- budget exhaustion or cool-off marks dependent active briefs blocked/stale and prevents additional surfacing until reset or explicit candidate budget widening
- candidate budget status is shown only in coarse terms and does not reveal requester identities, exact sparse counts, or private cohort membership
- opportunity briefs snapshot candidate exposure state without exposing exact private candidate details

## `background-candidate-exposure-budgets.test.ts`

Verify:

- non-`off` inbound delegate discovery requires bounded per-purpose/per-scope surfacing budgets, pending-intro limits, and cool-off behavior
- exhausted candidate budgets, active candidate cool-offs, missing budget settings, or stale budget versions suppress scoring, opportunity-brief creation, feedback advancement, candidate-facing exposure, and intro-request creation
- budget counters are enforced across requesters and delegate runs rather than only within a single requester run
- concurrent helper runs, retries, duplicate requests, or queue workers cannot exceed a candidate's budget; counter check-and-increment or reservation is atomic and idempotent
- failed, cancelled, stale, or expired surfacing/intro attempts release short-lived reservations and do not permanently consume budget
- candidates can narrow, pause, or reduce budgets immediately; widening budgets requires explicit confirmation and updates `candidate_inbound_budget_version`
- candidate-facing budget status is coarse and does not expose requester identities, exact sparse counts, private cohort membership, or probing signals
- requester-facing outputs never reveal whether a specific candidate was withheld because of budget exhaustion, cool-off, opt-out, exposure mismatch, cohort mismatch, privacy state, retention state, or prior dismissal/report
- requester-facing outputs never expose exact per-gate budget or blocker counts, candidate budget-state labels, or budget-state deltas; generic budget/availability aggregates are bucketed, withheld, or sufficiently aggregated
- budget counters are not used for popularity ranking, engagement optimization, public analytics, or candidate-specific profiling beyond consent-respecting burden control
- budget counter rows have retention windows, active-only candidate identifiers, and redaction/anonymization behavior; after retention cleanup they cannot be joined back to a candidate or used for matching, notifications, feedback advancement, or intro requests

## `background-purpose-registry.test.ts`

Verify:

- the purpose-code registry is the single source of truth for purpose labels, canonical summaries, allowed surfaces, prohibited-use codes, risk tiers, and confirmation requirements
- active semantic fields are append-only after activation; material changes require a new policy version or new purpose code
- disabled, deprecated, superseded, user-defined, missing, catch-all, or client-invented purpose codes are rejected
- UI/API purpose labels come from the same registry artifact used by server-side validation
- purpose-registry version changes mark dependent authorizations, candidate exposure settings, active briefs, and intro requests stale unless explicitly re-confirmed
- internal abuse notes, private rollout notes, and disabled experimental codes are not exposed through public or ordinary authenticated purpose-code responses

## `background-risk-review-gates.test.ts`

Verify:

- non-staff and external-pilot delegate runs require a current approved risk review covering the exact purpose code, purpose-policy version, surfaces, and audience/cohort scope
- missing, expired, revoked, blocked, wrong-version, wrong-surface, or wrong-cohort reviews fail closed before run creation, scoring, notifications, or candidate surfacing
- public-broad-preview and high-risk purpose/surface combinations require explicit operator approval plus a rollback plan and kill-switch owner
- feature flags, operator rollout flags, and test fixtures cannot bypass risk-review requirements outside internal/staff-only testing
- risk-review summaries exposed in docs, receipts, logs, or admin views are redacted and do not reveal exact wishes, source notes, private cohort membership, candidate identities, prompts, message text, or exploitable abuse heuristics

## `background-purpose-filtering.test.ts`

Verify:

- delegate authorizations require nonempty allowlisted purpose codes, a current purpose-policy version, and reject broad catch-all purposes
- delegate runs require exactly one purpose code selected from the authorization's allowed per-purpose bindings under the correct purpose-policy version
- authorizations with multiple allowed purpose codes create separate single-purpose runs, not a combined multi-purpose scan
- multi-purpose authorizations and candidate exposure settings preserve independent `{purpose_code, purpose_policy_version}` bindings for each purpose and reject a single ambiguous version across multiple codes
- delegate runs, opportunity briefs, receipts, and intro requests inherit and snapshot the same active purpose code and purpose-policy version without free-form override or registry-version substitution
- candidate inbound purpose settings are enforced before scoring and before opportunity-brief display
- purpose-code removal, deprecation, semantic change, or purpose-policy-version mismatch in candidate exposure or requester authorization marks dependent active briefs stale
- purpose labels shown in briefs and receipts remain broad and do not expose private free-text purpose descriptions

## `background-purpose-bindings.test.ts`

Verify:

- delegate authorizations store explicit per-purpose bindings, not one ambiguous policy version for multiple purpose codes
- candidate exposure settings store explicit per-purpose bindings, not one ambiguous policy version for multiple inbound purpose codes
- delegate-run creation selects exactly one bound `{purpose_code, purpose_policy_version}` pair and rejects any purpose code whose version is missing, stale, deprecated, superseded, disabled, or not bound in the authorization
- candidate surfacing checks the candidate's binding for the selected purpose code and rejects missing, stale, deprecated, superseded, disabled, or mismatched versions
- registry migration or re-confirmation updates bindings without silently applying one purpose's policy version to another purpose

## `background-rollout-gates.test.ts`

Verify:

- production defaults keep higher-power lanes off
- promotion is blocked when privacy incidents, prompt-injection bypasses, unsafe notifications, accessibility failures, queue-health failures, or rollback-test failures are present
- candidate-facing notification from mere scan or brief creation blocks promotion
- global cross-registry delegate runs remain blocked unless the explicit global flag and operator approval gate are both present

## `background-retention-lifecycle.test.ts`

Verify:

- delegate runs, opportunity briefs, feedback, intro requests, and receipts all have explicit retention windows
- stale, closed, dismissed, reported, expired, and deleted artifacts are deleted or anonymized after the participant-visible review window and any safety-review hold
- anonymized artifacts cannot be used for matching, notifications, feedback advancement, intro requests, or disclosure grants
- anonymization clears direct `candidate_profile_id`, `counterparty_profile_id`, and stable `candidate_key_hash` values unless an active legal/safety hold explicitly permits retention
- participant deletion removes participant-owned background artifacts except redacted/anonymized audit rows explicitly retained for safety, abuse prevention, or legal obligations
- retention jobs are idempotent and do not export raw source text, exact wishes, exact candidate identity, private cohort membership, prompts, message text, free-text reports, or private notes



## `background-retention-holds.test.ts`

Verify:

- retention holds require a reason code, owner, explicit scope, allowed retained fields, review date, and expiry date except where a legal-hold policy explicitly permits otherwise
- non-legal holds are time-bounded and cannot be renewed without fresh redacted justification
- held artifacts cannot be used for matching, notifications, feedback advancement, intro requests, disclosure grants, analytics exports, or public reports
- retention holds cannot reverse anonymization, repopulate cleared candidate/counterparty identifiers, unredact artifacts, or make stale artifacts actionable
- broad holds over a cohort, purpose, surface, retention class, or global scope require operator approval and a current incident/risk-review basis
- release or expiry of a hold enqueues idempotent retention cleanup and does not automatically reactivate runs, briefs, feedback, or intro requests
- participant/admin summaries of holds are redacted and do not expose exact wishes, source notes, private cohort membership, candidate identities, prompts, message text, legal strategy, hidden abuse heuristics, or sensitive admin notes


## `background-runtime-safety-tripwires.test.ts`

Verify:

- blocking tripwires for unsafe notifications, candidate-facing scan exposure, latent-vector matching attempts, missing/expired risk-review use, RLS/encryption failures, retention cleanup failures, anti-probing threshold breaches, and severe report/operator-overrule spikes fail closed before run creation, scoring, notifications, opportunity creation, feedback advancement, candidate-facing exposure, or intro-request creation
- triggered blocking tripwires activate the narrowest applicable emergency control or pause the affected lane without waiting for manual review
- user-controllable aggregate signals such as report spikes, mass dismissals, and suspicious feedback are deduplicated, rate-limited, and cannot alone trigger global, public-broad-preview, whole-purpose, whole-cohort, candidate-exposure-revocation, or broad deplatforming actions
- broad automatic pauses based partly on user-controllable aggregate signals require corroborating trusted invariant/platform-integrity signals or operator-confirmed evidence and use the narrowest justified scope
- review-only anomaly tripwires create redacted operator-review tasks but do not widen matching, disclosure, notification, or candidate exposure
- tripwire signals, logs, telemetry, and admin/participant summaries are redacted and do not expose exact wishes, source notes, private cohort membership, candidate identities, prompts, message text, hidden abuse heuristics, embeddings, latent vectors, or sensitive admin notes
- feature flags, fixtures, operator/admin actions, and break-glass states cannot bypass active blocking tripwires


## `background-emergency-controls.test.ts`

Verify:

- active global, purpose-code, purpose-policy-version, surface, audience-scope, cohort, notification-path, LLM-mode, and retention-class emergency controls fail closed for in-scope delegate runs, scoring, opportunity creation, notifications, feedback advancement, candidate-facing exposure, and intro-request creation
- emergency activation cancels or pauses pending runs and marks dependent active artifacts stale or emergency-paused
- emergency release does not automatically make stale artifacts actionable; recompute from currently valid inputs is required
- feature flags, operator/admin actions, fixtures, and break-glass states cannot bypass active emergency controls
- emergency-control logs and any participant/admin summaries are redacted and do not expose exact wishes, source notes, private cohort membership, candidate identities, prompts, message text, hidden abuse heuristics, or sensitive admin notes



## `background-admin-safety-actions.test.ts`

Verify:

- operator/admin actions can only narrow, suppress, quarantine, mark stale, reject, or approve a next step after all hard gates pass
- no admin action, feature flag, fixture, or break-glass state can bypass requester authorization, candidate exposure consent, purpose-policy compatibility, risk-review coverage, anti-probing floors, stale-state checks, retention/anonymization state, RLS, encryption, notification restrictions, or explicit-signal-only matching
- break-glass actions cannot surface candidates, send candidate-facing notifications, reveal private fields, repopulate cleared candidate/counterparty identifiers, or make stale artifacts actionable
- `approve_intro_review` cannot disclose contact details or exact wishes and is rejected unless all inherited purpose, consent, risk-review, stale-state, and operator-review requirements pass
- internal deterministic actions such as redacted brief creation, redacted receipt creation, stale marking, budget reservation, and retention cleanup may proceed only after hard gates pass and are rejected if they would disclose, contact, create reliance, or cause counterparty-facing state changes without the required review/consent stage
- admin safety-action logs and participant-facing summaries are redacted and do not expose exact wishes, source notes, private cohort membership, candidate identities, prompts, message text, hidden abuse heuristics, or sensitive admin notes


## `background-accessibility.test.ts` or existing route smoke

Verify:

- opportunity inbox, source review, wish profile apply, and consent controls have accessible names
- keyboard path can complete dismiss, report, and request-intro actions

---

# Commands

Run the repository’s canonical checks. Include at least:

```bash
npm run lint
npm run build
node --import tsx --test \
  src/lib/background-networking.test.ts \
  src/lib/background-delegate-authorizations.test.ts \
  src/lib/background-explicit-signal-matching.test.ts \
  src/lib/background-third-party-data-minimization.test.ts \
  src/lib/background-anti-probing.test.ts \
  src/lib/background-brief-staleness.test.ts \
  src/lib/background-delegate-receipts.test.ts \
  src/lib/background-rollout-gates.test.ts \
  src/lib/background-risk-review-gates.test.ts \
  src/lib/background-admin-safety-actions.test.ts \
  src/lib/background-emergency-controls.test.ts \
  src/lib/background-runtime-safety-tripwires.test.ts \
  src/lib/background-retention-holds.test.ts \
  src/lib/background-retention-lifecycle.test.ts \
  src/lib/background-candidate-exposure.test.ts \
  src/lib/background-candidate-exposure-budgets.test.ts \
  src/lib/background-purpose-registry.test.ts \
  src/lib/background-purpose-filtering.test.ts \
  src/lib/background-purpose-bindings.test.ts \
  src/lib/background-cohort-scoping.test.ts \
  src/lib/background-notification-policy.test.ts \
  src/lib/background-notifications.test.ts \
  src/lib/background-privacy-controls.test.ts \
  src/lib/background-explanations.test.ts \
  src/lib/background-opportunity-briefs.test.ts \
  src/lib/wish-registry.test.ts \
  src/lib/public-route-smoke.test.ts
```

Also run any newly added tests.

---

# Rollout and promotion gates

Keep all higher-power paths behind staged rollout gates.

Default sequence:

1. Internal/staff profiles only.
2. Tiny consenting cohort.
3. One partner-reviewed pilot pack or existing matchmaker workflow.
4. Broader cohort rollout only after documented promotion-gate review.

Promotion from one stage to the next requires:

- a current approved adversarial risk review covering the enabled purpose codes, purpose-policy versions, surfaces, audience/cohort scope, notifications, retention, LLM data handling, abuse/collusion risks, rollback plan, and kill-switch owner
- no active emergency stop applying to the promoted purpose codes, purpose-policy versions, surfaces, audience/cohort scope, notification path, LLM mode, or retention class
- no active blocking runtime safety tripwire applying to the promoted purpose codes, purpose-policy versions, surfaces, audience/cohort scope, notification path, LLM mode, retention class, or hard-gate family
- no unresolved tripwire anti-DoS concern, including user-controllable aggregate signals that have generated broad blocking proposals without trusted corroboration or operator-confirmed basis
- zero known privacy leakage incidents
- zero prompt-injection bypasses that mutate state, disclosure, ranking, feature flags, or authorization scope
- zero unsafe notification sends, including candidate-facing notification from mere scan/brief creation
- no material increase in false-match, report, or operator-overrule rates compared with the pilot baseline
- successful keyboard and screen-reader pass for delegate authorization, source-summary review, opportunity inbox, receipt log, and intro-request flows
- healthy queue latency and no retry-storm behavior
- documented rollback plan and tested revocation/deletion path

If any gate fails, pause promotion, preserve participant revocation paths, and keep existing opportunity briefs available only as redacted, participant-owned records.

---

# Documentation updates

Update:

- `/background-networking`
- `/wish-registry` if broad-preview behavior changes
- `/moral-trade/technical-spec`
- `/measurement` if events are added
- any public contract JSON or validator-backed route that describes background networking

Documentation must state:

- Background Delegate creates opportunity briefs, not introductions.
- Delegate runs require participant-controlled authorization, purpose limits, budget, expiry, and revocation. Each run is single-purpose; multiple authorized purposes must be handled as separate runs with separate receipts and anti-probing controls. Purpose-code meanings are governed by a single versioned registry and cannot be silently broadened or reinterpreted after consent. Multi-purpose consent stores per-purpose `{purpose_code, purpose_policy_version}` bindings, not one ambiguous version for several codes.
- The purpose-code registry is the source of truth for user-facing purpose labels, canonical summaries, allowed surfaces, and re-confirmation requirements. Deprecated, disabled, superseded, or materially changed purpose codes require explicit re-confirmation before reuse.
- Non-staff and external-pilot delegate runs require a current approved adversarial risk review covering the exact purpose code, purpose-policy version, surfaces, audience/cohort scope, notifications, retention, LLM data handling, abuse/collusion risks, rollback plan, and kill-switch owner.
- Operator/admin review is not a waiver mechanism. Manual actions can narrow, suppress, quarantine, mark stale, reject, or approve a next step after all non-waivable gates pass; they cannot override consent, purpose, risk-review, anti-probing, retention, RLS, encryption, notification, or explicit-signal matching requirements.
- Automated delegate runs may create only redacted, participant-owned internal artifacts such as opportunity briefs, receipts, stale transitions, budget reservations, and retention-cleanup actions after all hard gates pass. Human/operator review remains required before disclosure, contact, reliance, counterparty-facing notification, intro-review approval, or any non-redacted/counterparty-affecting state change.
- Scoped emergency stops are hard blockers. Active emergency controls can pause or cancel runs, suppress notifications, block surfacing and intro advancement, and make affected artifacts stale or emergency-paused; releasing a stop requires recomputation from valid inputs before action resumes.
- Runtime safety tripwires provide continuous fail-closed monitoring for known invariant failures and severe aggregate anomalies. Blocking tripwires activate scoped emergency controls or pause affected lanes; tripwire logs and summaries are redacted and are not matching inputs.
- Tripwire signals are classified by trust level. User-controllable aggregate signals such as report spikes cannot by themselves trigger broad emergency stops or deplatforming; broad containment requires trusted corroboration or operator-confirmed evidence and must use the narrowest justified scope.
- Opportunity briefs snapshot dependencies and become non-actionable when the authorization, source summary, profile version, candidate exposure setting, candidate discoverability, cohort scope, or expiry state becomes stale.
- Candidate profiles are scored or surfaced only when the candidate's separately confirmed inbound-delegate exposure settings authorize delegate-mediated discovery for the relevant purpose code, audience scope, cohort, and broad surfaces; ordinary profile discoverability alone is not sufficient.
- Candidate-side surfacing budgets, pending-intro limits, and cool-offs are enforced across requesters and runs. Exhausted budgets block additional surfacing or intro advancement, budget updates are atomic/idempotent, counter rows are retention-bound, and budget status is exposed only coarsely in candidate-owned views or internal safety tooling. Requester-visible, exportable, or public surfaces may use only generic availability/budget categories that are bucketed, withheld, or aggregated over a sufficiently broad safe pool.
- Requesters never receive exact candidate-specific blocker reasons. Candidate opt-out, budget exhaustion, cool-off, cohort mismatch, privacy-stage conflict, retention state, prior dismissal/report, and similar candidate-specific gates are mapped to generic privacy/availability/safe-pool/review categories.
- Requester-visible blocker/factor counts and diagnostics are also coarsened. Generic categories must be bucketed, withheld, or aggregated so requesters cannot infer exact numbers of candidates withheld for candidate-specific private reasons.
- No-result and timing behavior is also side-channel-safe. Requester-visible no-brief states, digest changes, queue timing, receipt sequence changes, retry timing, and notification absence must not let requesters infer whether a candidate exists or was filtered by a private candidate-specific gate.
- Candidate-dependency snapshots are internal-only. Candidate opt-in, discoverability, exposure-version, budget-version, cohort, retention/anonymization, and candidate-specific stale-cause fields may support server-side revalidation, but requester-facing stale labels and dependency explanations must stay generic.
- Requester-facing opportunity-brief APIs and UI use sanitized projections or server-side DTOs, not direct internal table rows. Internal candidate identifiers, candidate-dependency snapshots, exact blocker states, exact timing, and retention/anonymization causes are service-side only.
- Requester-facing payloads use versioned explicit allowlist schemas. Adding a new visible field requires a schema-version change, privacy review, and tests proving it does not expose candidate-specific gates, timing side channels, internal snapshots, or linkable identifiers.
- Candidates are not notified or exposed to requester interest by mere scan, shortlist, or brief creation.
- Default rollout is cohort-, pilot-, or matchmaker-scoped; global cross-registry delegate runs are disabled unless separately reviewed.
- Promotion beyond staff/internal scope requires documented promotion-gate checks and rollback paths.
- There is no autonomous outreach.
- There is no raw private-feed mining.
- Exact details require consent grants.
- AI proposals are schema-bound and review-only before apply.
- Matching uses only participant-visible, schema-bound, explicitly confirmed broad fields and tags; hidden embeddings, latent preference vectors, unreviewed model summaries, and uninspectable derived features are not match inputs.
- Matching does not reward oversharing. Score can use only a capped confirmed-signal sufficiency check; more private detail, more source summaries, more free text, more confirmed tags, retained history, or source variety must not improve ranking once sufficiency is met.
- Source-summary proposed or derived tags are not match inputs until explicitly confirmed; any legacy `derived_broad_tags` field is proposal-only and must not influence matching.
- Source-summary approval and tag confirmation are separate: approving a summary does not make any proposed tag matchable unless the user explicitly confirms that specific broad tag or an explicitly displayed batch of tags.
- Private third-party data in source summaries or imports is not a match input. A user's possession of text about someone else does not create permission to profile or match on that person's wishes, constraints, vulnerabilities, affiliations, capabilities, strategy, or contact details.
- LLM-assisted paths use no-training/no-retention or local/tenant-isolated equivalent modes and fail closed when those guarantees are unavailable.
- Source summaries are approved, revocable, and retention-bound.
- Helper runs are probe-resistant: minimum eligible-pool floors, dedupe windows, and count bucketing prevent enumeration.
- Redacted delegate receipts explain participant-visible run/brief/intro events without exposing private data.
- Linkable candidate references, direct candidate/counterparty UUIDs, stable candidate hashes, and free-text artifacts have explicit retention windows and are deleted, cleared, or anonymized after participant review, safety-review holds, or legal obligations no longer require them.
- Retention holds are separate, scoped, time-bounded, owner-assigned, field-minimized review artifacts. A hold may delay cleanup for the stated safety/legal purpose, but it cannot make stale artifacts actionable, reverse anonymization, repopulate identifiers, or feed matching/notification/intro flows.
- Private-overlap computation remains design-only unless a separate crypto/privacy review has already been completed in the repository.

---

# Definition of done

The build is complete only when:

- Users can opt into a Background Delegate.
- Users can create, inspect, limit, and revoke a delegate authorization with versioned purpose codes, surfaces, scope, budgets, confidence threshold, and expiry.
- The purpose-code registry is implemented as a single governed artifact; authorizations, candidate exposure confirmations, delegate runs, opportunity briefs, receipts, intro requests, UI labels, docs, and tests all validate against that same registry and fail closed on missing, deprecated, disabled, superseded, or materially changed codes.
- Multi-purpose delegate authorizations and candidate exposure settings store explicit per-purpose `{purpose_code, purpose_policy_version}` bindings; no implementation path treats one policy version as covering multiple purpose codes unless the registry explicitly defines that exact global versioning scheme.
- Non-staff and external-pilot delegate runs fail closed unless covered by a current approved adversarial risk review for the exact purpose code, purpose-policy version, surfaces, and audience/cohort scope, with documented abuse/collusion analysis, notification review, retention review, LLM data-handling mode, rollback plan, and kill-switch owner.
- Operator/admin and break-glass actions are non-waiver safety actions only: they can narrow, suppress, quarantine, mark stale, reject, or approve a next step after all hard gates pass, but cannot override consent, purpose-policy compatibility, risk-review coverage, anti-probing, stale-state, retention/anonymization, RLS, encryption, notification, or explicit-signal matching requirements.
- The implementation clearly separates automated redacted internal artifacts from human-reviewed external effects: redacted brief/receipt/stale/budget/cleanup actions can run after hard gates pass, while disclosure, contact, reliance, counterparty-facing notification, intro-review approval, and non-redacted/counterparty-affecting state changes remain review- and consent-gated.
- Scoped emergency controls exist for global, purpose-code, purpose-policy-version, surface, audience-scope, cohort, notification-path, LLM-mode, and retention-class incidents; active controls fail closed for in-scope runs, surfacing, notifications, feedback advancement, and intro creation, and release requires recompute from currently valid inputs.
- Runtime safety tripwires exist for known invariant failures and severe aggregate anomalies; blocking tripwires activate scoped emergency controls or pause affected lanes, cannot be bypassed by feature flags, fixtures, operator/admin actions, or break-glass states, and use only redacted aggregate signals.
- Tripwire signal-trust classes and anti-DoS limits are enforced: user-controllable aggregate signals cannot alone trigger global, public-broad-preview, whole-purpose, whole-cohort, candidate-exposure-revocation, or broad deplatforming actions, and any broad containment based partly on those signals requires trusted corroboration or operator-confirmed evidence.
- Each delegate run uses exactly one allowlisted purpose code under a stable purpose-policy version selected from explicit per-purpose authorization and candidate-exposure bindings, and opportunity briefs, receipts, and intro requests inherit that same code and version without purpose substitution or semantic reinterpretation.
- Users can create/apply a structured wish profile.
- Users can separately confirm, inspect, narrow, pause, and revoke inbound delegate discovery and inbound purpose codes for their own profile, with default-off behavior for new, imported, migrated, reactivated, and privacy-reset profiles.
- Users can set, inspect, narrow, pause, and explicitly widen candidate-side surfacing budgets, pending-intro limits, and cool-off settings; exhausted budgets are hard blockers across requesters and runs, counter updates are atomic/idempotent, counter rows are retention-bound with active-only candidate identifiers, and budget status is visible only as coarse state in candidate-owned views or internal safety tooling, never as requester-visible/exportable candidate-specific budget state.
- Requester-facing briefs, receipts, diagnostics, notifications, APIs, telemetry, and docs do not reveal exact candidate-specific blocker reasons; they use generic privacy/availability/safe-pool/review categories for candidate opt-out, budget, cool-off, cohort, privacy-stage, retention, prior-dismissal/report, and similar gates.
- Requester-facing blocker/factor counts, receipt aggregates, diagnostics, and telemetry exports are bucketed, withheld, or sufficiently aggregated so exact candidate-specific gate counts and deltas cannot be inferred.
- Requester-facing no-result, no-brief, withheld, blocked-run, receipt-timing, queue-timing, digest-delta, retry-timing, and notification-absence behavior cannot be used to infer candidate existence or candidate-specific gate outcomes.
- Candidate-dependency snapshots are internal-only and requester-facing dependency/stale labels are generic; candidate opt-in, discoverability, exposure-version, budget-version, cohort, retention/anonymization, and candidate-specific stale-cause fields are not exposed through requester-facing APIs, receipts, exports, diagnostics, notifications, telemetry, or docs.
- Requester-facing opportunity-brief APIs, UI, receipts, exports, diagnostics, and telemetry are generated from sanitized projections/DTOs that physically exclude internal-only columns; ordinary authenticated users cannot read internal opportunity-brief rows or columns containing active candidate identifiers, candidate-dependency snapshots, exact blocker states, exact timing, or retention/anonymization causes.
- Requester-facing opportunity-brief, receipt, diagnostic, export, telemetry, cache, and UI-hydration payloads are validated against versioned explicit allowlist schemas; extra keys, newly added internal columns, ORM relation objects, debug metadata, and schema-spread fields cannot reach requester-visible surfaces.
- Users can approve/revoke source summaries with retention and allowed-field controls.
- Delegate runs generate deterministic privacy-safe opportunity briefs only within active authorization and cohort/matchmaker scope.
- The deterministic matching path uses only participant-visible, schema-bound, explicitly confirmed broad fields and tags; hidden embeddings, latent preference vectors, unreviewed model summaries, and uninspectable derived features cannot influence eligibility, scoring, surfacing, notifications, feedback advancement, or intro requests.
- Matching uses capped confirmed-signal sufficiency rather than profile completeness; additional private detail, source-summary volume, free text, confirmed tag count, retained history, or source variety cannot increase score after sufficiency is met.
- Source-summary tags have a clean proposal/confirmation boundary: source-summary approval alone is not tag confirmation; `unconfirmed_derived_tags` are proposal-only, `confirmed_broad_tags` with explicit per-tag confirmation records are the only source-summary tags usable for matching, and any legacy `derived_broad_tags` field is proposal-only or migrated away.
- Private third-party data in source summaries, imports, manual notes, email/calendar excerpts, public URL summaries, or chatbot history cannot become a match input; third-party wishes, constraints, vulnerabilities, affiliations, capabilities, strategy, or contact details require that third party's own independent profile/exposure confirmation.
- Opportunity briefs snapshot authorization, profile, source-summary, candidate-exposure, candidate-discoverability, cohort, and expiry dependencies.
- Stale briefs cannot notify, advance to intro requests, create disclosure grants, or otherwise remain actionable.
- Prohibited-coordination, purpose-mismatch, purpose-policy-version mismatch, anti-enumeration, anti-probing, uncertainty-gating, candidate-exposure, candidate-budget, privacy-stage, revocation, and safety blockers suppress opportunity creation regardless of score.
- Opportunity notifications are generic and go only to the participant whose delegate created the brief.
- Candidate-facing notification or requester-interest exposure cannot occur before intro-request, operator-review, and mutual-consent gates.
- Every delegate run, brief creation, stale transition, and intro-request creation has a participant-visible redacted receipt.
- Delegate runs, opportunity briefs, feedback, intro requests, and receipts have explicit retention windows; after those windows, linkable candidate references, direct counterparty/candidate UUIDs, stable candidate hashes, and free-text content are deleted or anonymized while only permitted redacted/anonymized audit rows remain.
- Retention holds are implemented as governed, scoped, time-bounded, owner-assigned, field-minimized artifacts; held records are excluded from matching, notifications, feedback advancement, intro requests, disclosure grants, analytics exports, and public reports, and release/expiry resumes cleanup without making stale artifacts actionable.
- Interested feedback creates an intro request without disclosure.
- Operator review and mutual consent remain required before contact or exact-wish disclosure.
- All private tables are RLS-protected.
- All sensitive text is encrypted or stored using the repository’s existing sensitive-field convention.
- LLM-assisted paths meet the no-training/no-retention or local/tenant-isolated-equivalent constraint, minimize input text, and fail closed when unavailable.
- Rollout gates block promotion when privacy, prompt-injection, unsafe-notification, accessibility, queue-health, or rollback tests fail.
- All tests pass.
- Public docs and contract routes accurately reflect the behavior.

---

# Explicit non-goal: production private-overlap crypto

Build the delegate/opportunity-brief loop now. Do **not** build production private-overlap crypto in this task.

Moral Trade’s public private-overlap gate says private overlap is design-only, live endpoints are blocked pending cryptographic review, and future storage should be blinded-token-only with raw/canonical tags forbidden.

Forethought itself treats the privacy/surveillance/collusion tradeoff as unresolved and important. The safer concrete mechanism is therefore to generate reviewable opportunity briefs from approved broad signals, within explicit delegate authorizations and scoped pilot communities, rather than expose richer hidden matching infrastructure immediately.
