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

## Revision 51 improvements

This revision adds one high-confidence intro-flow privacy correction: **server-derived intro targets and sanitized requester-facing intro-request projections**.

Rationale: the mechanism already protects opportunity-brief projections, but the intro-request stage still contains active `counterparty_profile_id` and inherited brief linkage while users are moving from interest to operator-reviewed mutual consent. A requester must not be able to supply, override, infer, or receive a counterparty identifier through intro-request creation, status polling, receipts, exports, or timing. Intro targets must therefore be derived server-side from a valid active opportunity brief under service-role gates, and requester-facing intro-request responses must use their own versioned sanitized projection/schema.

## Revision 52 improvements

This revision adds four consent/minimization corrections with positive expected value:

- **Time-bounded candidate exposure confirmations.** Candidate-side inbound delegate discovery is a standing permission to be surfaced by background helpers. If it can remain active indefinitely, a candidate who opted in during an old pilot, under old expectations, or before a life/context change could keep being surfaced long after their consent is no longer practically current. Non-`off` candidate exposure settings must therefore have explicit confirmation timestamps and finite expiry / re-confirmation windows; expired or stale candidate exposure is a hard blocker and marks dependent active artifacts stale.
- **Sanitized counterparty-facing intro-consent requests with no requester-detail pre-disclosure.** Revision 51 prevents requester-side leakage during intro-request creation and status polling, but the counterparty-facing consent request is another disclosure surface. If an operator-reviewed intro-consent notification reveals the requester's exact identity, contact details, exact wishes, source notes, private cohort membership, or the exact reason the counterparty was selected before the counterparty has opted into the exchange, the system can still leak sensitive requester data and create pressure or harassment dynamics. Counterparty-facing consent prompts must therefore use their own sanitized, versioned allowlist schema and disclose only the minimum broad context needed for the counterparty to decide whether to continue to the mutual-consent stage.
- **Feedback/action events are not implicit matching signals.** Requester actions such as viewing a brief, dismissing it, deferring it, reporting it, clicking through receipts, or requesting an intro can become sensitive behavioral profiles if the system silently learns from them. They can also create engagement-driven ranking pressure that conflicts with the mechanism's explicit-field-only design. Feedback and action events should therefore be treated as action state, retention/cool-off input, and redacted safety signals only. They may influence future matching only if the participant explicitly confirms a schema-bound broad profile field or tag through the same consent path used for other match inputs.
- **Idempotent single-active intro requests per opportunity brief.** Repeated interested feedback, explicit intro-request calls, client retries, double-clicks, queue retries, and malicious replays can create duplicate intro requests, duplicate receipts, repeated budget reservations, repeated operator queue items, or timing differences that leak candidate-specific state. For each requester-owned opportunity brief and inherited purpose-code/version pair, intro advancement must therefore be idempotent: one active intro request may exist, replays return the same sanitized state or a generic conflict, and recomputation must use a new valid brief rather than reviving a stale or declined one.

## Revision 53 improvements

This revision adds seven >50%-credible privacy and consent-safety improvements:

- **Least-privilege operator review and just-in-time sensitive-field reveal.** Operator review is necessary for intro safety, but an operator console that shows full internal rows, exact wishes, raw source notes, active candidate identifiers, or exact targeting reasons by default can itself become surveillance infrastructure. Operator review workbenches must therefore be redacted by default. Any reveal of exact fields must be field-scoped, reason-coded, role-limited, time-bounded, logged, and unavailable for bulk browsing, export, search, or analytics.
- **Time-bounded, revocable field-level disclosure grants after mutual consent.** “Mutual consent” should not become a permanent or broad data-sharing state. Exact details should move only through explicit field-level grants that name the grantor, recipient, purpose code/version, intro request, granted field keys, expiry, revocation path, and retention policy. Grants are non-transitive, cannot be reused for matching or future unrelated intros, and must not disclose raw source notes or exact private wishes unless those exact field keys were intentionally granted.
- **Counterparty intro-consent notification budgets and no requester-triggered reminders.** Counterparty-facing consent prompts can become harassment or a side channel if requesters can repeatedly nudge, observe reminder timing, or infer whether the counterparty ignored, declined, timed out, reported, or asked for more context. Counterparty notifications and reminders must therefore be system-controlled, rate-limited, budgeted, generic, and side-channel-safe; requester clients must not trigger reminders or receive exact reminder/engagement state.
- **Named, scoped partner-matchmaker grants.** `partner_matchmaker` is useful for Forethought-style niche/community deployment, but if interpreted as a general privileged role it can become a registry-extraction surface. Partner-matchmaker use must therefore be tied to a named active grant covering the partner/workflow, purpose-code/version, surfaces, cohort/audience scope, quotas, operator identities, expiry, and sanitized output schemas.
- **Collective-profile authority and member-data minimization.** Forethought allows existing collectives to use background networking, but collective documents can contain member-level wishes, vulnerabilities, affiliations, or strategy. Collective profiles must require current representative authority and must not turn private member data into match inputs unless the relevant member independently confirms it through their own profile/exposure settings.
- **Cross-account and partner-seat anti-probing.** Per-requester anti-probing can be bypassed by account rotation, partner seats, coordinated requesters, or repeated manual scans. The mechanism must use privacy-safe, redacted, retention-bound abuse signals to detect materially equivalent probes across accounts/workflows and apply narrow throttles or review without creating broad fingerprinting.
- **No payment, partner, or engagement-priority boosting of people.** Monetization and partner workflows may affect access to reviewed lanes or quota, but payment tier, sponsorship, partner commercial priority, or engagement likelihood must not affect person eligibility, score, candidate ordering, surfacing, notification priority, intro advancement, or disclosure.

## Revision 54 improvements

This revision adds four >50%-credible privacy, safety, and implementation-hardening improvements:

- **Sensitivity-tiered signal taxonomy and vulnerability-signal gating.** Broad fields are safer than exact private details, but not all broad fields are equally safe. A broad tag such as “seeking emergency housing,” “needs legal help,” “financially distressed,” “health-related constraint,” or “immigration-risk context” can still expose vulnerability and create exploitation risk. Every matchable field/tag should therefore be classified through a maintained signal taxonomy. High-sensitivity or vulnerability-like signals require explicit step-up confirmation, purpose compatibility, risk-review coverage, and genericized outputs; they must not add positive score merely because they make a match more exploitable or urgent.
- **Participant-controlled private do-not-match / block / mute preferences.** Dismissals and reports already create cool-offs, but participants also need a durable private way to prevent future surfacing, intro requests, or reminders involving a known person, organisation, cohort, or post-intro counterparty. Pairwise or scoped block/mute preferences must be internal-only, requester-safe, and non-enumerating: they block future matching and intro advancement without revealing that a block exists or who set it.
- **Revocation-aware cache, outbox, and client-storage invalidation.** Server-side consent checks are not sufficient if stale sanitized payloads, queued emails, push notifications, browser caches, CDN objects, exports, or UI hydration blobs continue to expose old opportunity/intro/disclosure state after authorization, exposure, source-summary, disclosure-grant, emergency-control, or block-state changes. Every requester/counterparty-visible artifact must therefore be short-lived, grant-versioned where relevant, and revalidated at render/send/download time; revocation must purge or stale queued and cached surfaces.
- **Synthetic-only development, test, staging, replay, and evaluation data.** The implementation spec has strong production minimization rules, but engineers can accidentally recreate surveillance risk through production database clones, replay logs, screenshots, fixtures, LLM eval corpora, or debugging exports. Development, CI, staging, demos, load tests, model evaluation, and red-team replay must therefore use synthetic or formally redacted fixtures by default, with production-sensitive background-networking data prohibited unless a scoped legal/security incident process explicitly allows minimum-necessary access.

## Revision 55 improvements

This revision adds three architecture-level improvements with positive expected value:

- **Centralized deny-by-default policy-decision layer.** The current mechanism contains many non-waivable gates across routes, workers, renderers, outboxes, and retention jobs. That is correct but brittle: if each path re-implements the gates, future changes can create inconsistent enforcement. Every externally meaningful background-networking action should therefore go through a single canonical policy evaluator that returns a versioned allow/deny verdict, redacted reason classes, and the dependency versions used. Missing, stale, partial, or wrong-action policy decisions fail closed.
- **Participant-owned sensitive-data vault and key-isolation boundary.** The mechanism already forbids raw-feed mining and requires encryption, but exact source summaries, exact wishes, contact fields, and disclosure-granted details can still become a centralized surveillance surface if ordinary application paths can decrypt them broadly. Raw/exact data should therefore live in a participant-owned encrypted vault or repository-equivalent sensitive-field store with purpose-scoped keys, just-in-time decrypt, no bulk query/export path, and no central matching access; the matcher receives only confirmed broad signals and redacted policy outputs.
- **Privacy-budgeted aggregate analytics and public-reporting release controls.** Per-user surfaces are heavily sanitized, but repeated analytics queries over internal tables can reconstruct sparse candidate-specific facts. Aggregate dashboards, public reports, partner summaries, telemetry exports, and measurement queries should therefore go through a release-control layer with minimum cohort thresholds, query/version registration, differencing protections, suppression/noise where appropriate, and no ad-hoc analyst access to exact internal rows.

## Revision 56 improvements

This revision adds four >50%-credible architecture and implementation improvements:

- **Match-input lineage and orphan-signal invalidation.** The mechanism now has strong confirmation, taxonomy, retention, and revocation gates, but a copied broad signal can still become orphaned from the exact consent/source event that authorized it. Every match input should therefore carry server-side lineage to its current confirmation record, source/profile version, taxonomy version/hash, purpose binding, retention state, and revocation state; orphaned, stale, or unverifiable signals fail closed and mark dependent artifacts stale.
- **Quasi-identifier and rare-combination redaction before surfacing.** Even generic factor codes, broad cause areas, coarse location, cohort labels, purpose labels, and timing-safe outputs can identify a person when combined in a small community. Requester-facing and counterparty-facing payloads should therefore pass a rare-combination / quasi-identifier risk check that withholds or coarsens combinations of fields that are unique or too sparse inside the safe pool.
- **Conservative entity-resolution and duplicate-profile linking.** Background networking can accidentally convert imported aliases, email/calendar contacts, organization names, public URLs, or partner records into candidate identities. Entity resolution must be self-claimed, independently verified, or operator-confirmed under a narrow policy; ambiguous or imported-only identity links are not match inputs and must not be used to merge profiles, dedupe candidates, or disclose counterparties.
- **High-impact consent comprehension and no-dark-pattern confirmation.** The mechanism now has many consent surfaces. For higher-risk scopes such as public-broad-preview discovery, high-sensitivity/vulnerability signals, partner-matchmaker exposure, collective authority, field-level disclosure grants, and budget widening, consent UI should use neutral copy, show the concrete consequences, avoid nudges/default-on choices, and require an explicit comprehension/confirmation event.


## Revision 57 improvements

This revision adds four >50%-credible architecture and implementation improvements:

- **Two-person control for high-impact governance and safety changes.** The mechanism now has centralized policy decisions, risk reviews, purpose registries, emergency controls, partner grants, vault reveal paths, and aggregate-release controls. Those are powerful governance levers. A single operator or admin should not be able to activate, broaden, release, or materially weaken high-impact controls. High-impact changes therefore require separation of duties, dual approval where repository policy requires it, immutable audit records, and no self-approval by the actor who proposed or benefits from the change.
- **Delegate execution sandbox and tool-capability registry.** Even if the matching algorithm is deterministic, background jobs and future LLM-assisted delegates can accidentally acquire new powers through tool integrations, queue workers, browser fetchers, partner APIs, or notification systems. Delegate runs must therefore execute in a capability-limited sandbox: read-only where possible, no arbitrary outbound network, no write tools, no contact or calendar actions, no scraping, no code execution over imported content, and no new tool surface unless it is registered, risk-reviewed, feature-flagged, and policy-gated.
- **Step-up authentication and account-compromise safety holds for high-impact participant actions.** A compromised account could create broad delegate authorizations, enable public-broad-preview exposure, widen candidate budgets, confirm sensitive tags, reveal vault fields, or grant disclosure. High-impact participant actions must therefore require recent step-up authentication or repository-equivalent reauthentication, and suspicious account-security events must pause high-impact background networking actions until review or participant re-confirmation.
- **Participant correction and non-disclosing appeal path.** Users need a way to correct their own profile fields, source-summary tags, exposure settings, safety preferences, entity-resolution claims, and disclosure grants without learning candidate-specific private facts. The system should provide correction/appeal workflows that operate on the participant's own records and generic denial categories, mark dependent artifacts stale when corrections are accepted, and avoid exposing counterparties, hidden blockers, abuse heuristics, or private cohort membership.

## Revision 58 improvements

This revision adds seven >50%-credible architecture and implementation improvements:

- **Claim-assurance levels for high-impact offers, credentials, and capabilities.** Background networking can be exploited if a participant can self-assert scarce resources, credentials, authority, funding ability, legal/medical/immigration expertise, fiscal sponsorship, institutional affiliation, or other high-impact capabilities and have those claims drive surfacing before any assurance check. Self-attested claims may remain participant-visible drafts or low-assurance broad signals, but high-impact or reliance-relevant claims need an explicit assurance level, evidence/verification state, expiry, purpose compatibility, and genericized outputs before they can create high-confidence opportunity briefs, intro advancement, or reliance.
- **Ephemeral non-surfaced candidate evaluation and no near-miss retention.** The current mechanism strongly protects surfaced opportunity briefs, but the matcher could still create a shadow people-ranking database if it retains rejected candidates, near-miss scores, blocked-candidate lists, per-candidate factor vectors, or full candidate-evaluation traces. Candidate evaluation for non-surfaced candidates must therefore be ephemeral by default. After a run completes, the system may retain only redacted aggregate counters, policy-decision ids, tripwire labels, quota effects, and safety audit rows that cannot be joined back to a non-surfaced candidate except under a valid active safety/legal hold.
- **Retention-aware backups, snapshots, and disaster recovery.** Deletion, redaction, anonymization, cache invalidation, and retention holds can be undermined by database backups, object-store snapshots, search-index snapshots, warehouse snapshots, and disaster-recovery restores. Backup and restore systems must therefore be encrypted, access-limited, time-bounded, excluded from analytics, covered by deletion/redaction manifests where technically feasible, and prevented from reintroducing stale, revoked, or anonymized linkable data into active systems after restore.
- **External federation and cross-platform bridge gates.** Forethought's sketch could naturally point toward cross-community or cross-platform helpers, but exporting broad profiles or querying external registries can bypass Moral Trade's consent, anti-probing, and retention boundaries. Any federation, partner callback, external search index, or cross-platform bridge must therefore be default-off, named, purpose-bound, risk-reviewed, policy-gated, schema-sanitized, revocation-aware, minimum-necessary, and covered by aggregate-release controls. No raw source text, exact wishes, internal rows, candidate identifiers, or reusable candidate-specific profile exports may leave the repository by default.
- **Operator, reviewer, partner-seat, and admin conflict-of-interest recusal.** The spec already requires least-privilege review and two-person control, but conflicted reviewers can still steer introductions, suppress candidates, reveal fields, approve partner grants, or review matters involving themselves or affiliated organisations. High-impact review, intro approval, field reveal, partner-grant approval, risk-review approval, aggregate release, and emergency-control release therefore need conflict checks, recusal where configured, and an independent reviewer path.
- **Pre-registered pilot evaluation, shadow/canary promotion, and sunset criteria.** The spec has promotion gates, but each non-staff lane should pre-register what success, harm, and failure look like before ordinary users are exposed. Each purpose/surface/cohort pilot should have a time-bounded evaluation record with utility metrics, safety metrics, false-positive/false-negative review targets, candidate-burden limits, participant-value targets, data-retention commitments, shadow/canary requirements, and explicit sunset/rollback criteria. Missing, expired, failed, or inconclusive evaluation records fail closed for promotion and public-broad-preview use.
- **Independent adversarial safety-case artifacts tied to rollout gates.** Internal risk review and tests can become checklist items unless they are tied to concrete adversarial scenarios. Non-staff, partner, public-broad-preview, new-tool, federation, high-sensitivity, or new-signal-taxonomy promotion should reference a current adversarial evaluation / safety-case artifact covering enumeration, side channels, collusion, exploitation of vulnerability signals, projection/schema leaks, operator misuse, conflict of interest, prompt-injection/source-text attacks, duplicate/replay behavior, backup/restore leakage, and rollback/revocation drills. Unresolved critical findings fail closed until resolved.


## Revision 59 improvements

This revision adds four >50%-credible architecture and implementation improvements:

- **Run-scoped pseudonymous candidate handles and identity/contact-service separation.** The mechanism already limits active candidate identifiers and sanitized projections, but deterministic workers can still become a broad internal identity graph if they operate directly on stable profile ids. Matching, scoring, anti-probing, receipts, and policy decisions should therefore use short-lived run-scoped candidate handles that cannot be joined across runs or resolved to accounts outside a tightly gated identity/contact service. Exact account/profile/contact resolution occurs only after a fresh policy decision for operator review, mutual consent, or legally required safety handling.
- **Participant privacy freeze / panic pause.** Participants need a one-action way to stop all background networking exposure if they face harassment, account compromise, coercion, sensitive life changes, or loss of trust. An account-wide privacy freeze must pause outbound delegate runs, inbound surfacing, queued notifications, intro advancement, disclosure-grant access, partner/federation outputs, exports, cache renders, and nonessential operator reveals without revealing the freeze to requesters or counterparties. Release requires step-up authentication and fresh revalidation from current inputs.
- **No model-training, personalization, or engagement-optimization reuse of background-networking data.** The spec already forbids hidden matching features and requires synthetic data outside production, but production broad signals, receipts, feedback, reports, opportunity outcomes, source-summary proposals, operator decisions, and intro states could still be repurposed to train models or optimize engagement. Background-networking data must not be used for model training, fine-tuning, embedding training, recommender training, behavioral personalization, ad targeting, engagement optimization, or product analytics feature learning unless a separate explicit opt-in and risk review authorizes a narrow use; even then it must not create match inputs without the normal confirmation path.
- **Non-disclosing participant data access, export, and portability controls.** Participants should be able to inspect and export their own contributed profile fields, authorizations, source-summary metadata, confirmed tags, candidate-exposure settings, disclosure grants, and redacted receipts without receiving counterparty identities, hidden blockers, candidate-specific stale causes, internal policy decisions, abuse heuristics, rare-combination internals, or partner/cohort membership facts. Export jobs must use versioned sanitized schemas, revalidate policy at generation and download time, expire quickly, and be invalidated by revocation, privacy freeze, retention cleanup, or emergency controls.

## Revision 60 improvements

This revision adds three >50%-credible architecture and implementation improvements:

- **Release/config manifest provenance for policy-critical code and governed artifacts.** The spec now depends on many governed artifacts: the policy evaluator, purpose registry, signal taxonomy, output schemas, tool-capability registry, risk-review gates, feature flags, migrations, and retention jobs. If these drift across workers, routes, partner services, or deploys, the hard gates can silently become inconsistent. Every externally meaningful background-networking action should therefore run under a current signed or otherwise immutable release/config manifest that binds the code version, policy-engine version, migrations, governed registries, schema bundles, feature-flag defaults, and rollout gates used for that action. Missing, stale, wrong-scope, or unreviewed release manifests fail closed.
- **Subject identity, non-human account, and automation-disclosure boundaries.** Background networking may involve individuals, organisations, collectives, partner seats, service accounts, and future AI agents. If automated or organisational subjects can appear as ordinary individuals, users can be deceived and consent becomes materially less meaningful. Each participant profile therefore needs a subject-identity record naming whether it represents an individual, organisation, collective, automated agent, service account, or partner/operator role; non-human or automated subjects require current human accountability, authority, scope, and sanitized disclosure labels before surfacing, intro prompts, or disclosure.
- **Power-asymmetry and dependency-safety gates.** Vulnerability-signal gating reduces exploitation risk, but exploitation can also arise from relationships such as funder/grantee, employer/applicant, landlord/tenant, clinician/client, legal or immigration adviser/client, mentor/mentee, platform admin/user, or other high-dependency contexts. The mechanism should detect explicit high-asymmetry relation signals and route them through purpose-compatible risk review, operator review where configured, neutral consent copy, no urgency or scarcity boosting, and side-channel-safe generic requester/counterparty labels before intro advancement or disclosure.

## Revision 61 improvements

This revision adds two >50%-credible architecture and implementation improvements:

- **Least-permissive policy composition across overlapping consents, holds, grants, and governance controls.** The mechanism now has many independently scoped controls: requester authorizations, candidate exposure, source-summary tag confirmations, disclosure grants, partner/federation grants, pairwise safety preferences, privacy freezes, retention holds, emergency stops, runtime tripwires, aggregate-release policies, subject-identity authority, power-asymmetry reviews, and vault policies. If these are evaluated in an ad hoc order, a broad allow from one layer could accidentally override a narrower denial from another. The policy evaluator should therefore compose all applicable controls using intersection / least-permissive semantics: denies, pauses, expiries, narrower scopes, missing bindings, and ambiguity win over broad grants unless an explicit non-waiver exception is itself part of the governed policy registry.
- **Explicit artifact state-machine and transition-policy enforcement.** The spec contains many states for authorizations, source summaries, delegate runs, opportunity briefs, intro requests, disclosure grants, holds, emergency controls, exports, and receipts. Without a canonical transition policy, retries, admin tools, migrations, restore jobs, or rollback paths could jump artifacts from stale/closed/redacted/anonymized states back into actionable states. Each stateful artifact type should therefore have a governed transition policy that lists allowed transitions, required policy-decision action kind, actor role, prerequisite states, non-actionability guarantees, side effects, receipt/audit behavior, and forbidden resurrection transitions. Unknown, skipped, reverse, or cross-artifact-inconsistent transitions fail closed.


## Revision 62 improvements

This revision adds one >85%-credible implementation and rollout improvement:

- **Phased implementation boundary with fail-closed stubs for non-MVP lanes.** The current specification intentionally describes a mature, highly safety-hardened background-networking system. But asking Codex to implement every advanced lane at once creates a substantial risk of partial, inconsistent, or insecure implementation. The first build must therefore use an explicit phase plan: implement the internal/staff-safe core vertical slice first, and make every unimplemented higher-power lane fail closed through explicit disabled routes, policy decisions, feature flags, stubs, and tests. Partner-matchmaker, federation, public-broad-preview, high-sensitivity signal, high-impact claim, aggregate-release, and vault-reveal lanes must not exist as partially wired TODO paths that can be accidentally reached.

## Revision 63 improvements

This revision adds one >85%-credible implementation and acceptance-criteria improvement:

- **Phase-scoped definition of done and test obligations.** Revision 62 adds phased implementation boundaries, but later acceptance and command sections can still be read as requiring Codex to implement every mature-system lane in the first pass. That would recreate the partial-implementation risk Revision 62 was meant to prevent. The spec must therefore distinguish the full-system definition of done from the current-phase definition of done: a phase is complete only when every enabled surface for that phase passes its tests, and every future-phase surface is explicitly disabled, documented, policy-denied, and covered by fail-closed tests. Codex must not satisfy acceptance by adding placeholder tests or partially wiring future lanes.

## Revision 64 improvements

This revision adds one >85%-credible implementation and rollout-control improvement:

- **Governed current-phase artifact and phase-gate binding.** Revision 63 makes acceptance phase-scoped, but a phase declared only in implementation notes, docs, or tests can drift from the deployed routes, workers, feature flags, release manifest, and policy evaluator. The current implementation phase must therefore be a server-side governed artifact, bound into the release/config manifest and policy-decision layer. Routes, workers, UI, docs, and tests must derive or validate against that same phase record. A mismatch between the declared phase and an enabled route, feature flag, worker, table path, partner callback, export path, telemetry path, or docs page fails closed. This preserves the phased-build safety improvement while making it operational rather than merely documentary.

## Revision 65 improvements

This revision adds one >85%-credible implementation and rollout-control improvement:

- **Concrete phase-gate bundle registry and lane matrix.** Revision 64 makes the current phase a governed policy input, but `phase_gate_bundle_version` alone does not specify the exact lane-level allow/deny matrix that Codex must enforce. The implementation should therefore include a governed phase-gate bundle registry, or repository-equivalent typed configuration, that enumerates every background-networking route, worker, UI panel, queue consumer, export path, telemetry path, partner callback, source-summary path, LLM path, intro path, disclosure path, vault path, aggregate-report path, and federation path as enabled, staff-only, shadow/canary, disabled-stub, or blocked for the active phase. Unregistered lanes fail closed, and feature flags may only narrow a lane state unless a governed release/config change updates the phase-gate bundle.

## Revision 66 improvements

This revision adds one >85%-credible implementation and rollout-control improvement:

- **Content-addressed, append-only phase-gate bundles.** Revision 65 adds a lane-level phase-gate matrix, but a mutable `phase_gate_bundle_version` is not enough if a database row, typed config, or generated registry can be edited in place while keeping the same version. The active release/config manifest should bind both the phase-gate bundle version and a canonical content hash over the complete sorted lane matrix. Activated phase-gate bundles and lane rows must be append-only: broadening a lane, changing allowed action kinds, changing feature-flag requirements, changing risk-review requirements, or changing unavailable codes requires a new bundle version/hash and governed manifest activation. In-place mutation, hash mismatch, partial bundle materialization, or a policy decision whose bundle hash no longer matches the active manifest fails closed.

## Revision 67 improvements

This revision adds one >85%-credible replay-safety and implementation-control improvement:

- **Atomic single-use consumption of side-effecting policy decisions.** The mechanism already requires fresh, action-specific policy decisions, but a stored allow verdict can still become a replay surface if a queue worker, route retry, admin tool, or partner callback can reuse the same decision for multiple side effects before expiry. Side-effecting or externally delivering actions must therefore consume an allow decision atomically with an action idempotency key and the current release/phase/lane/schema/dependency snapshot. Replayed, already-consumed, wrong-idempotency-key, wrong-lane, wrong-schema, or stale-dependency decisions fail closed. Pure read/render decisions remain short-lived and output-bound; they cannot be reused to mutate state, enqueue work, send notifications, create intros, export data, disclose fields, or emit sensitive telemetry.

## Revision 68 improvements

This revision adds one >85%-credible policy-enforcement and implementation-control improvement:

- **Governed policy-action-kind registry with complete side-effect coverage.** Revision 67 makes policy decisions single-use, but a compact or stale `action_kind` enum can lag behind the many lanes and side effects the specification requires, causing developers to reuse nearby action kinds or add broad catch-all values such as `other`, `admin_action`, or `background_operation`. Policy action kinds must therefore come from a governed allowlist/registry bound into the release/config manifest, phase-gate bundle, tool-capability registry, and policy-decision records. Every state-mutating, externally delivering, reveal, governance, partner, export, telemetry, vault, and retention action must have an explicit active action kind; unregistered, catch-all, wrong-lane, or missing action kinds fail closed. Adding or broadening an action kind that can create side effects requires governed release/config activation and, where applicable, high-impact change approval.

## Revision 69 improvements

This revision adds one >85%-credible policy-integrity and implementation-control improvement:

- **Content-addressed, append-only policy-action-kind registry.** Revision 68 makes action kinds governed and complete, but a mutable action-kind registry version can still be edited in place while keeping the same version, changing what a stored policy decision, phase-gate lane, tool capability, or state-transition policy means. The active release/config manifest should therefore bind both the policy-action-kind registry version and a canonical content hash over the complete sorted action-kind registry. Activated action-kind registry rows must be append-only: adding an action kind, broadening allowed actor roles or lane kinds, changing side-effect class, removing single-use/idempotency requirements, changing step-up/review requirements, or changing output-schema requirements requires a new registry version/hash and governed manifest activation. In-place mutation, hash mismatch, partial registry materialization, or a policy decision whose action-kind registry hash no longer matches the active manifest fails closed.

## Revision 70 improvements

This revision adds one >85%-credible output-safety and implementation-control improvement:

- **Content-addressed, append-only output-schema bundles.** Revision 50 and later revisions require versioned allowlist schemas, but a mutable `output_schema_bundle_version` can still be edited in place while keeping the same version, changing what fields route handlers, cache renderers, exports, telemetry builders, partner callbacks, or counterparty prompts are allowed to emit. The active release/config manifest should therefore bind both the output-schema bundle version and a canonical content hash over the complete sorted output-schema registry. Activated output-schema rows must be append-only: adding a public key, changing an allowed field, changing a redaction/bucketing rule, changing an extra-key policy, changing surface bindings, or changing audience/lane applicability requires a new schema bundle version/hash and governed manifest activation. In-place mutation, hash mismatch, partial schema materialization, or a policy decision whose output-schema bundle hash no longer matches the active manifest fails closed.

## Revision 71 improvements

This revision adds one >85%-credible tool-boundary and implementation-control improvement:

- **Content-addressed, append-only tool-capability bundles.** The delegate sandbox depends on `tool_capability_bundle_version`, but a mutable tool-capability bundle can still be edited in place while keeping the same version, changing what workers, LLM proposal helpers, partner callbacks, notification builders, retention jobs, or vault-access paths may do. The active release/config manifest should therefore bind both the tool-capability bundle version and a canonical content hash over the complete sorted tool-capability registry. Activated tool-capability rows must be append-only: adding a tool, widening allowed action kinds, enabling network/write/vault access, increasing maximum input-data class, weakening risk-review requirements, or changing side-effect class requires a new tool-capability bundle version/hash and governed manifest activation. In-place mutation, hash mismatch, partial bundle materialization, or a policy decision whose tool-capability bundle hash no longer matches the active manifest fails closed.

## Revision 72 improvements

This revision adds one >85%-credible purpose-consent integrity and implementation-control improvement:

- **Content-addressed, append-only purpose-code registry.** Revisions 27 and 28 make purpose-code meanings versioned and governed, but a mutable `purpose_registry_version` can still be edited in place while keeping the same version, changing what a requester or candidate consented to. The active release/config manifest should therefore bind both the purpose-registry version and a canonical content hash over the complete sorted purpose-code registry. Activated purpose-code rows must be append-only: adding a purpose, broadening a purpose meaning, widening allowed surfaces, weakening prohibited uses, lowering risk tier, weakening operator-review or re-confirmation requirements, or changing public labels/summaries requires a new purpose-registry version/hash and governed manifest activation. In-place mutation, hash mismatch, partial registry materialization, stale purpose rows, client-supplied purpose-registry claims, or a policy decision whose purpose-registry hash no longer matches the active manifest fails closed.

## Revision 73 improvements

This revision adds one >85%-credible signal-safety and implementation-control improvement:

- **Content-addressed, append-only signal-taxonomy registry.** Revision 54 makes signal taxonomy central to whether fields and tags may influence matching, surfacing, notifications, intro requests, and disclosure prompts, but a mutable `signal_taxonomy_version` can still be edited in place while keeping the same version. That could silently lower a signal's sensitivity tier, remove vulnerability-like status, widen allowed purposes or surfaces, weaken step-up/operator/risk-review requirements, or change prohibited uses without causing dependent consent and matching artifacts to stale. The active release/config manifest should therefore bind both the signal-taxonomy version and a canonical content hash over the complete sorted signal-taxonomy registry. Activated signal-taxonomy rows must be append-only: adding a signal class, lowering sensitivity, removing vulnerability-like classification, widening allowed purposes/surfaces, weakening confirmation/review/risk-review requirements, changing prohibited uses, or changing public labels requires a new signal-taxonomy version/hash and governed manifest activation. In-place mutation, hash mismatch, partial taxonomy materialization, stale signal rows, client-supplied taxonomy claims, or a policy decision whose signal-taxonomy hash no longer matches the active manifest fails closed.

## Revision 74 improvements

This revision adds one >85%-credible claim-reliance and implementation-control improvement:

- **Content-addressed, append-only claim-assurance taxonomy.** Revision 58 makes high-impact claim assurance central to preventing self-attested credentials, authority, funding capacity, institutional affiliation, legal/medical/immigration expertise, fiscal sponsorship, scarce resources, or safety-relevant capabilities from driving surfacing, reliance, intro advancement, or disclosure without appropriate assurance. But `claim_assurance_taxonomy_version` is currently only a mutable version reference. A row or typed-config entry could be edited in place while keeping the same version, silently lowering the minimum assurance level, widening purposes/surfaces, weakening evidence requirements, extending expiry windows, or weakening reliance limits. The active release/config manifest should therefore bind both the claim-assurance taxonomy version and a canonical content hash over the complete sorted claim-assurance taxonomy. Activated claim-assurance taxonomy rows must be append-only: adding a claim class, lowering minimum assurance, widening allowed purposes/surfaces, weakening evidence or review requirements, extending maximum validity, changing reliance limits, or changing public labels requires a new taxonomy version/hash and governed manifest activation. In-place mutation, hash mismatch, partial taxonomy materialization, stale claim-assurance rows, client-supplied taxonomy claims, or a policy decision whose claim-assurance taxonomy hash no longer matches the active manifest fails closed.

## Revision 75 improvements

This revision adds one >85%-credible retention-integrity and implementation-control improvement:

- **Content-addressed, append-only retention-policy bundles.** The mechanism already requires explicit retention windows, anonymization, deletion, cache invalidation, outbox suppression, backup deletion manifests, and non-actionability for retained artifacts, but `retention_policy_bundle_version` is currently only a mutable version reference. A row or typed-config entry could be edited in place while keeping the same version, silently extending linkable retention, widening retained fields, weakening anonymization/deletion triggers, weakening cache/outbox invalidation, changing backup/restore deletion-manifest requirements, or allowing held records to remain usable. The active release/config manifest should therefore bind both the retention-policy bundle version and a canonical content hash over the complete sorted retention-policy bundle. Activated retention-policy rows must be append-only: adding a retention class, extending linkable windows, widening retained fields, weakening anonymization/deletion requirements, weakening cache/outbox invalidation, changing backup/deletion-manifest requirements, or changing non-actionability guarantees requires a new retention-policy bundle version/hash and governed manifest activation. In-place mutation, hash mismatch, partial bundle materialization, stale retention-policy rows, client-supplied retention-policy claims, or a policy decision whose retention-policy bundle hash no longer matches the active manifest fails closed.

## Revision 76 improvements

This revision adds one >85%-credible policy-semantics and workflow-integrity improvement:

- **Content-addressed, append-only policy-composition and artifact-transition bundles.** The mechanism already treats least-permissive policy composition and non-resurrecting artifact state transitions as non-waivable, and the test plan already expects state-transition policies and policy-composition rules to be release-manifest-bound. But `background_policy_composition_rules.version` and `background_artifact_state_transition_policies.version` are still ordinary mutable version references, and the release/config manifest does not yet bind their content hashes. A row or typed-config entry could therefore be edited in place while keeping the same version, silently weakening deny-overrides, conflict behavior, actor roles, required preconditions, side effects, or resurrection constraints. The active release/config manifest should bind both policy-composition and artifact-transition bundle versions and canonical content hashes. Activated composition and transition rows must be append-only: broadening composition behavior, weakening conflict behavior, adding non-waiver exceptions, broadening actor roles, reducing transition preconditions, removing side effects, or adding resurrection paths requires a new bundle version/hash and governed manifest activation. In-place mutation, hash mismatch, partial bundle materialization, stale rows, client-supplied bundle claims, or a policy decision whose composition or transition bundle hash no longer matches the active manifest fails closed.

## Revision 77 improvements

This revision adds one >85%-credible aggregate-privacy and implementation-control improvement:

- **Content-addressed, append-only aggregate-release policy bundles.** The mechanism already requires aggregate dashboards, partner reports, public reports, telemetry exports, measurement queries, and research extracts to pass aggregate-release controls with minimum cohort thresholds, differencing protections, suppression/noise, expiry, review, and revocation. But `aggregate_release_policy_version` remains only a mutable version reference, and `background_aggregate_release_controls` rows can still be edited in place while preserving the same version/scope. That could silently lower minimum group size, weaken differencing windows, change suppression/noise, broaden query families/scopes, or weaken revocation effects. The active release/config manifest should therefore bind both aggregate-release policy bundle version and a canonical content hash over the complete sorted aggregate-release control bundle. Activated aggregate-release rows must be append-only: adding a query family, lowering minimum group size, widening scope, weakening suppression/noise/differencing, extending expiry, changing review requirements, or changing revocation invalidation requires a new bundle version/hash and governed manifest activation. In-place mutation, hash mismatch, partial bundle materialization, stale aggregate-release rows, client/analyst/partner-supplied aggregate-release claims, or a policy decision whose aggregate-release policy hash no longer matches the active manifest fails closed.

## Revision 78 improvements

This revision adds five >=50%-credible UI/UX and implementation-specific product-safety improvements:

- **Participant task-based control center and guided onboarding.** Background networking now has many independent controls, and an ordinary user should not have to infer the model from scattered settings. The UI should therefore expose a task-based control center with separate cards for outbound delegate authorization, inbound candidate exposure, wish/profile signals, source-summary review, opportunity briefs, intro/disclosure state, receipts/export/correction, and privacy freeze. Onboarding must be staged and default-off: users first see the current phase, what the delegate can and cannot do, what data can become match input, what remains hidden, what expires, and what revocation changes before they opt into any outbound or inbound lane.
- **Server-derived screen/action state, not client-inferred controls.** The client must not infer enabled actions, stale state, exposure eligibility, or next steps from internal rows, feature flags, route presence, or local UI logic. Participant-facing screens should render from sanitized server-side screen-state DTOs, derived under the same phase-gate, output-schema, policy-decision, consent, retention, and privacy-freeze gates as the underlying action. Disabled, stale, blocked, future-phase, and unavailable states must be explicit, generic, and non-enumerating rather than hidden only by client-side UI.
- **Plain-language privacy-impact labels and receipt-first UX.** Every high-impact confirmation, revocation, exposure, budget, tag-confirmation, source-summary approval, intro request, disclosure grant, export, and privacy-freeze flow should show a short plain-language privacy-impact summary: what data may be used, for which purpose, by which audience/scope, for how long, which surfaces can change, what revocation does, and what will remain hidden. A receipt timeline should show user-visible run/brief/intro/consent events and state changes without exposing candidate identities, hidden gate outcomes, internal policy snapshots, rare-combination internals, or abuse heuristics.
- **Opportunity, intro, and counterparty prompt microcopy contract.** Opportunity cards and intro prompts should be designed as decision aids, not engagement bait. Requester-facing cards must say that the brief is not an introduction, show only broad reason/factor categories, confidence band, generic dependency/stale labels, and the exact safe next step. Counterparty-facing prompts must show only broad purpose, broad requested disclosure categories, coarse expiry/review window, and choices such as review, decline, or ask for more context. Both surfaces must avoid urgency/scarcity copy, popularity cues, exact targeting reasons, candidate-specific gate labels, and notification-opening incentives.
- **Complete side-effecting policy-decision bundle binding in the hard-invariant summary.** Earlier revisions added content-addressed policy-composition, artifact-transition, and aggregate-release policy bundles, but the hard-invariant summary for atomic single-use side-effecting decisions still named only some bundle hashes. The hard invariant should match the data model and policy-decision requirements: side-effecting decisions must also bind policy-composition, artifact-transition where transition-bound behavior is used, and aggregate-release where aggregate-release-bound behavior is used.

## Revision 79 improvements

This revision adds seven >=50%-credible UI/UX, architecture, and concrete implementation improvements:

- **Server-derived effective-permission previews and before/after consent diffs.** Background Delegate now has enough intersecting controls that users can accidentally misunderstand what an authorization, inbound exposure setting, tag confirmation, budget widening, disclosure grant, export, or vault reveal will actually change. Any enabling or scope-widening participant action should therefore require a short-lived, server-derived effective-permission preview that shows the current state, proposed state, data-use delta, audience/surface delta, expiry/reconfirmation change, revocation effect, and hidden-data categories, without exposing candidate-specific facts or internal policy logic.
- **Participant notification and attention-budget controls.** Background networking is meant to operate in the background, but uncontrolled notifications can become annoyance, pressure, or a timing side channel. Participants should be able to set digest frequency, quiet hours, channel preferences, maximum non-critical notification volume, and immediate-freeze/safety-notice exceptions. These preferences may only narrow or batch non-critical notifications; they must not force immediate candidate-specific delivery or override side-channel-safe cadence, emergency stops, legal/safety notices, or counterparty notification budgets.
- **Progressive-disclosure, safe error-recovery, and non-overwhelming control surfaces.** A safety-hardened system should not force ordinary users to reason through the whole mature governance stack on every screen. The control center should show a simple safe path first, with advanced controls separated, search/filter for the participant's own records, explicit cancel/back paths, and safe undo or reversal for non-disclosing participant mistakes where reversal does not resurrect stale artifacts, create consent, disclose counterparties, or bypass revalidation.
- **Accessibility, localization, readability, and low-bandwidth hard gates.** The current UI requirements already mention keyboard and screen-reader support, but enabled user-facing flows should also satisfy repository-standard WCAG 2.2 AA-or-better checks, visible focus order, non-color-only status communication, reduced-motion support, touch/mobile layout, resilient timeout/error recovery, plain-language copy, locale-aware dates/times, and localization review for consent-critical copy. These checks should block promotion for enabled user-facing lanes.
- **Screen-state policy-decision nullability correction.** Inert informational and disabled-stub projections should not require a policy decision when they expose no current consent/exposure state, exact participant-owned data, or action controls. `policy_decision_id` should be nullable for those inert projections, while remaining required for screens that expose actions, current consent/exposure status, exact participant-owned data, exports, or other decision-relevant state.
- **Physically separated internal opportunity dependencies.** The spec already says candidate-dependency snapshots are internal-only and requester-facing routes must use sanitized projections, but a combined opportunity-brief row with active candidate identifiers and participant-owned visible fields remains an implementation hazard. Active candidate references, run-scoped candidate handles, candidate opt-in/exposure/budget/cohort snapshots, exact candidate-gate codes, exact stale causes, and internal dependency hashes should live in a service-role-only `background_opportunity_brief_internal_dependencies` table or equivalent protected store. Participant-facing brief rows and screen-state DTOs should contain only sanitized/redacted fields; legacy combined tables must fail closed for ordinary routes until column grants, split storage, and serializer tests prove internal fields cannot leak.
- **First-class UI-copy bundle manifest binding.** The new preview, localization, and consent-copy requirements refer to an active UI-copy bundle, but without manifest fields, policy-decision fields, and a concrete copy-bundle artifact, implementers could still place consent-critical text in ordinary CMS strings, translation files, or client bundles. The UI-copy bundle must therefore be content-addressed, append-only, release-manifest-bound, policy-decision-bound where rendered or sent, and tested against screen-state DTOs, notification builders, receipts, consent dialogs, effective-permission previews, docs, and localization files.

## Revision 80 improvements

This revision adds five >=50%-credible UI/UX and implementation-integrity improvements:

- **Empirical UI-safety and comprehension-review gates for enabled user-facing lanes.** The mechanism now has strong server-derived screen states, UI-copy bundles, privacy-impact summaries, and effective-permission previews, but a formally correct UI can still be unsafe if ordinary participants misunderstand the mental model: outbound delegate authorization versus inbound exposure, opportunity brief versus introduction, revocation effects, what remains hidden, no autonomous outreach, no raw-feed mining, or when exact details can move. Enabled non-staff or high-impact user-facing lanes should require a current UI-safety/comprehension review for the exact phase, lane, screen set, output-schema bundle, UI-copy bundle, locale set, and audience scope.
- **UI-copy bundle snapshots for screen states and effective-permission previews.** Screen-state and effective-permission-preview artifacts should snapshot the UI-copy bundle version/hash and locale that shaped the participant-facing copy. Otherwise a cached screen state or consent diff can survive a consent-copy, localization, accessibility-label, or privacy-impact wording change. A UI-copy bundle change should stale dependent screen states, permission previews, receipt renders, notification renders, exports, and policy decisions before participant-facing render or confirmation.
- **Expanded governed participant receipt timeline.** The UI promises a receipt timeline for opt-in, authorization, exposure, source-summary approval, tag confirmation, delegate runs, opportunity creation, stale transitions, feedback advancement, intro requests, disclosure grants, exports, freezes, revocations, and retention cleanup, but the concrete `background_delegate_receipts.event_kind` enum still covered only delegate runs, opportunity creation/stale, and intro creation. Receipts should cover participant-visible consent, privacy, notification, correction/export, disclosure, freeze, and retention lifecycle events, with output-schema and UI-copy bundle binding, redacted visibility states, and safety-delay handling for operator or legal/safety events.
- **No session replay, heatmaps, DOM capture, or third-party behavioral analytics on Background Delegate surfaces.** Consent, source-summary, opportunity, intro, disclosure, freeze, export, and receipt screens are themselves sensitive. Generic product analytics, session replay, heatmaps, full DOM snapshots, mouse/scroll paths, keystroke logging, third-party pixels, or behavioral A/B systems can silently reconstruct wishes, exposure settings, candidate-gate timing, or consent behavior even when application telemetry is redacted. Background Delegate UI instrumentation should be first-party, allowlisted, aggregate/redacted, output-schema-bound, and unable to capture page content or behavioral trails.
- **Low-friction privacy-freeze activation.** A privacy freeze is only useful in harassment, coercion, account-compromise, or panic situations if the participant can find and activate it quickly. Every Background Delegate screen and relevant authenticated notification/export surface should expose a persistent pause/freeze affordance. Activation should not require step-up authentication, a reason, a multi-step explanation, or support contact; release or narrowing still requires step-up authentication and fresh revalidation.

## Revision 81 improvements

This revision adds five >=50%-credible architecture, concrete implementation, and UI/UX improvements:

- **Canonical governed-bundle hashing and materialization profile.** The mechanism now relies on many content-addressed bundles, but a hash is only meaningful if every route, worker, CI job, and operator tool uses the same canonicalization and materialization rules. The active release/config manifest should therefore bind a governed bundle-canonicalization profile defining included fields, row selection, row ordering, array ordering, null/empty handling, Unicode normalization, timestamp/number encoding, environment scoping, materialization queries, and hash algorithm. Same logical bundle data must hash identically across code paths; different semantics must never hash identically by accident or by implementation drift.
- **Client-surface isolation and URL/referrer leakage controls.** Revision 80 blocks behavioral analytics and session replay, but sensitive Background Delegate screens can still leak through third-party scripts, fonts, images, iframes, browser extensions, URL query strings, referrers, service-worker caches, or route-level debug parameters. Enabled Background Delegate screens should therefore run under a governed client-surface integrity policy: strict CSP, no third-party scripts/resources by default, no sensitive ids or state in URLs, no referrer leakage, short-lived opaque route tokens where needed, no persistent offline cache for sensitive screens, and fail-closed tests for any page that violates the policy.
- **Synthetic preview and dry-run isolation.** The control center includes a `synthetic_preview` screen, but previews can become unsafe if they query the live registry, sample real candidate distributions, or reuse real blocker/timing labels. Onboarding examples, demos, dry runs, and UI comprehension tests should therefore use explicitly synthetic fixtures or formally redacted scenarios only. Synthetic previews must be clearly labelled, must not create delegate runs or policy side effects, and must not let participants infer whether real counterparties exist.
- **Disclosure-access acknowledgement and revocation-honesty UX.** The spec says revocation blocks future access and cannot technically claw back previously viewed information, but the grant/access model should make that non-misleading in product behavior. Exact-field disclosure should use short-lived server-rendered access, recipient purpose-bound acknowledgement, no silent bulk download by default, coarse access-state labels rather than exact open timing, and grantor/counterparty copy that distinguishes future-access revocation from retroactive erasure.
- **Non-coercive renewal, expiry, and safety-check reminders.** Many permissions are intentionally time-bounded. Renewal UI can accidentally become dark-pattern pressure if it pushes users to keep authorizations, inbound exposure, budgets, high-sensitivity tags, or disclosure grants active. Renewal and expiry reminders should therefore be batched, optional where safe, neutral, and default-to-expire; they should offer pause/narrow/revoke as first-class outcomes and never imply that expiry is a failure or that opportunities will be lost unless the participant broadens scope.

## Revision 82 improvements

This revision adds four >=50%-credible architecture, concrete implementation, and UI/UX improvements:

- **Content-addressed, append-only safety-blocker taxonomy.** Prohibited-coordination and safety blockers are already non-waivable, but the spec still leaves their precise categories and severities partly implicit in prose, purpose-code prohibited-use fields, scoring formulas, and tests. A central safety-blocker taxonomy should therefore define prohibited coordination classes, blocked action families, requester-safe labels, severity, review requirements, and hard-block behavior; the active release/config manifest and policy decisions should bind its version/hash. Same-version mutation, stale blocker rows, client/partner/operator-supplied blocker claims, or missing blocker coverage must fail closed.
- **Queue backpressure, stale-by-delay, and delayed-send suppression.** Background helpers, outboxes, digest jobs, intro prompts, exports, and retention cleanup can become unsafe if a backlog drains after authorizations, exposures, budgets, privacy freezes, or safety contexts have changed. Pending work should therefore have lane-specific maximum freshness windows, stale-by-delay transitions, queue-health gates, and side-channel-safe delayed-send behavior. Old queued work should stale, cancel, or recompute silently rather than sending catch-up notifications or advancing old artifacts.
- **Frictionless decline, not-now, and no-reason exits.** Background networking should not pressure requesters or counterparties to justify declining, pausing, letting something expire, or choosing “not now.” Decline/no-reason exits should be visible, low-friction, non-punitive, and generic to the other side. Declines, ignores, timeouts, and “not relevant” actions must not become candidate reputation, requester quality, engagement, or matching signals except through explicit participant-confirmed profile updates or redacted safety workflows.
- **Operator-review calibration and blinded quality sampling.** Operator review is a safety layer, but inconsistent or poorly calibrated review can become an arbitrary gate or surveillance channel. High-impact review lanes should therefore use redacted or synthetic calibration cases, blinded second-review sampling where configured, disagreement queues, reviewer-quality process metrics, and periodic review of operator-workbench reveal rates, without turning reviewer behavior into candidate/requester ranking or exposing raw sensitive data.

## Revision 83 improvements

This revision adds four >=50%-credible architecture, concrete implementation, and UI/UX improvements:

- **Governed artifact-dependency graph and stale-propagation worklist.** The mechanism already says that revocation, correction, retention cleanup, manifest changes, policy changes, and source changes must mark dependent artifacts stale, but the dependency relation is scattered across prose, tables, policy decisions, caches, queues, and receipts. A first-class dependency graph should therefore record which active artifacts, policy decisions, screen states, receipts, outbox rows, exports, cache payloads, intro requests, disclosure grants, and partner/federation payloads depend on which authorizations, exposure settings, source summaries, confirmed tags, subject-identity records, manifests, bundle hashes, grants, holds, freezes, and emergency controls. Missing dependency edges, failed stale propagation, or stale-propagation backlogs must fail closed for affected actions.
- **Default mediated first-contact relay with explicit boundary setting.** The mechanism currently allows exact field-level disclosure after mutual consent, but exact contact-detail disclosure is often more permanent than users expect and can increase harassment or pressure risk. After mutual consent and operator review, the default first-contact path should therefore be a mediated relay or repository-equivalent privacy-preserving contact session that lets both parties exchange limited, purpose-bound messages or scheduling intentions without exposing email, phone, external accounts, exact location, or full profile identity. Exact contact fields still require a separate explicit disclosure grant. The relay must have clear boundaries, rate limits, no-reason exits, attachment/link restrictions, retention limits, block/freeze integration, and no message-content telemetry.
- **External processor and delivery-provider minimization controls.** The spec minimizes internal telemetry and blocks third-party analytics, but notification, email, SMS, push, cloud logging, error monitoring, CDN, fraud, and support vendors can still receive sensitive metadata or generic-but-probing-relevant delivery state. Any external processor used by Background Delegate surfaces should therefore be named, purpose-bound, data-class bounded, output-schema constrained, retention-limited, disabled by default for sensitive lanes, and bound into policy decisions and the release manifest. Unsupported vendors, raw/exact payloads, candidate-specific gate labels, and delivery/open/click telemetry to processors must fail closed.
- **Tamper-evident sensitive audit chain for high-impact actions.** The mechanism requires redacted receipts, immutable audit records, and append-only governed bundles, but ordinary audit rows can still be edited or deleted by sufficiently privileged insiders if the repository lacks a tamper-evident chain. High-impact approvals, manifest activations, policy/bundle activations, emergency releases, vault reveals, operator field reveals, external processor activations, retention/legal holds, safety overrides, and exact disclosure actions should therefore emit redacted events into a tamper-evident append-only audit chain or repository-equivalent WORM/audit-log system. The audit chain must not reveal exact wishes, candidate identities, raw source text, message content, or hidden abuse heuristics.

## Revision 84 improvements

This revision adds five UI/UX and language-simplification improvements that preserve the full safety and consent model while making the participant experience easier to understand:

- **Plain-language term map with technical-detail escape hatches.** The mature mechanism contains necessary implementation terms such as policy decision, phase-gate bundle, candidate exposure, disclosure grant, retention hold, and artifact transition. Those terms should not be the default participant-facing language. The UI-copy bundle should include a governed plain-language term map that renders action-oriented labels first, such as “Find opportunities for me,” “Let others find me,” “Possible opportunity,” “Ask to explore,” “Share exact details,” “Pause everything now,” and “Activity receipt,” with a separate “Technical details” view for precise internal terms. Simplification must not omit privacy impact, expiry, revocation, audience, or hidden-data information.
- **One-page setup model using six simple questions.** Onboarding and scope-broadening flows should present the same underlying controls through six stable questions: what can it use, what should it look for, where can it look, who may see a broad preview, how often should it run or notify, and when should this permission end. Advanced fields remain available, but the simple path must be sufficient for ordinary users to make safe choices without reading governed-artifact or registry jargon.
- **Consistent three-part privacy summaries.** Every high-impact action should show a compact, repeated structure: “What happens,” “What stays hidden,” and “How to stop or undo future access.” This reduces cognitive load while preserving the existing required privacy-impact elements, effective-permission previews, receipts, expiry, and revocation effects.
- **Small canonical status vocabulary.** Participant-facing screens should collapse internal states into a small non-enumerating status vocabulary, such as `off`, `ready`, `waiting`, `possible_opportunity`, `needs_review`, `paused`, `stale_or_unavailable`, and `closed`. Exact internal reasons remain service-side only; the simplified labels must be generated from server-derived screen states and active output/UI-copy schemas.
- **Progressive technical detail without feature removal.** Each screen should expose a short default explanation, then “Why am I seeing this?” and “Technical details” panels. These panels can reveal purpose code/version, broad signal categories, retention window, policy-decision receipt reference, and governed copy/schema versions when safe, but must not reveal candidate-specific gates, hidden blockers, rare-combination internals, abuse heuristics, or exact counterparties.

## Exact best concrete mechanism

Build a **Consent-Gated Background Delegate that creates privacy-safe opportunity briefs**.

Credence in this as the right first mechanism for Moral Trade: **0.76**.

Do **not** make live private-feed scraping, autonomous outreach, or production private-set-intersection the first build. Forethought’s background-networking section describes a “matchmaking marketplace” of attentive personalized helpers that look for promising connections and notify principals, with passive source access and proactive wish injection as possible inputs. It also flags privacy, surveillance, harassment, exploitation, and collusion as central design risks.

Moral Trade’s current public implementation already emphasizes broad previews first, consent before detail, no autonomous outreach, deterministic matching, no private-feed mining, minimal telemetry, anti-enumeration budgets, and default-off higher-power lanes.

The exact mechanism is:

> **A user-approved delegate profile + reviewed source summaries + deterministic broad-preview matching + generic opportunity briefs + mutual-consent intro requests.**

## Operational flow

0. Every deployed route, worker, queue consumer, renderer, outbox, partner callback, export job, telemetry builder, and retention job runs under a current release/config manifest that binds the policy engine, governed-bundle canonicalization profile, policy-composition bundle, artifact-transition bundle, migrations, purpose registry, signal taxonomy, safety-blocker taxonomy, output schema bundle, UI-copy bundle, client-surface integrity policy, tool-capability bundle, retention-policy bundle, aggregate-release policy bundle, feature-flag defaults, queue-freshness controls, artifact-dependency/stale-propagation policy, external processor controls, sensitive-audit-chain policy, and rollout gates used for that action. A stale, missing, wrong-scope, or unreviewed manifest blocks the action.
   - The policy evaluator composes every applicable authorization, exposure setting, field grant, safety preference, privacy freeze, retention hold, emergency stop, tripwire, partner/federation grant, aggregate-release policy, subject-identity authority, power-asymmetry review, vault policy, and output-schema rule using least-permissive semantics. Ambiguous or conflicting controls fail closed.
   - Any state change for a background-networking artifact must follow the governed artifact state-machine transition policy for that artifact type; skipped, reverse, resurrection, or unregistered transitions fail closed.
1. A participant enters the Background Delegate control center, sees the current implementation phase, enabled and disabled surfaces, plain-language privacy model, and the separation between outbound delegate authorization and inbound candidate exposure, then opts into Background Networking through a staged default-off onboarding flow. Any first enablement or later scope broadening must be preceded by a server-derived effective-permission preview and before/after consent diff. Synthetic previews and onboarding examples are clearly labelled, use only synthetic/formally redacted fixtures, and never query live registry pools. User-facing non-staff or high-impact lanes require a current UI-safety/comprehension review, and every Background Delegate screen exposes a low-friction privacy-freeze affordance.
2. The participant creates an explicit **delegate authorization** that states what broad coordination purpose the helper may serve, what surfaces it may use, where it may search, how often it may run, how many briefs it may create, the minimum confidence band, and when the authorization expires. Higher-risk authorizations use neutral, no-dark-pattern consent copy, show the current effective-permission preview, and record an explicit comprehension/confirmation event tied to that preview before activation.
3. The participant creates a **structured wish profile** through explicit fields and, where enabled, a fluent but schema-bound interview. The participant or represented subject also has a subject-identity record: individual, organisation, collective, automated agent, service account, or partner/operator role. Non-human, automated, organisational, and collective subjects require current authority, human accountability, and sanitized disclosure labels before they can be surfaced or advanced into intro flows.
4. The participant may add **manual or imported source summaries**, but raw feeds are not continuously searched, stored in analytics, or used directly for matching. Raw source material, exact wishes, exact source summaries, and exact disclosure-granted fields remain behind the participant-owned sensitive-data vault / key-isolation boundary; the matching service receives only confirmed broad signals and redacted policy outputs.
5. The system converts only user-approved wishes and source summaries into **broad matching signals**, and every matchable field/tag is assigned a current content-addressed signal-taxonomy sensitivity tier and a match-input lineage record before use:
   - cause areas
   - offers
   - asks
   - capabilities
   - constraints
   - verification preferences
   - coarse availability
   - privacy stage
   - exclusions
   - signal sensitivity tier and vulnerability-gating state
   - match-input lineage to the current confirmation, source/profile version, taxonomy version/hash, purpose binding, retention state, and revocation state
   - claim-assurance level from the current content-addressed claim-assurance taxonomy for high-impact offers, credentials, authority, resources, or capabilities
6. A background helper job periodically searches the wish registry using only those broad signals and only inside the participant-approved authorization scope. Each helper run must select exactly one allowlisted purpose code from the active authorization and the current content-addressed, versioned purpose-code registry; multiple authorized purposes require separate runs, receipts, stale-state checks, and anti-probing budgets. By default, that scope should be a specific cohort, pilot pack, named partner-approved audience, or existing matchmaker workflow rather than the whole registry. Partner-matchmaker scopes must reference a specific active partner grant; collective profiles must have current representative authority and member-data minimization checks; any federation, external search, or cross-platform bridge must reference a named active federation grant and remain default-off. Delegate execution must run inside the registered tool-capability sandbox for the selected action kind, with no arbitrary network, scraping, write, contact, calendar, federation, or external side-effect tools. Candidate evaluation inside the run uses run-scoped pseudonymous candidate handles; stable profile/account/contact identifiers remain outside the matcher and can be resolved only by the identity/contact service after a fresh policy decision.
7. Before scoring, the helper applies an anti-probing floor, safety-blocker/prohibited-coordination taxonomy gate, signal-safety gate, claim-assurance taxonomy/record gate, and quasi-identifier check: the authorized search pool must be broad enough, repeated candidate exposure must be deduped, visible count outputs must be bucketed rather than exact, unclassified, lineage-orphaned, or under-assured high-impact claims must fail closed, high-sensitivity/vulnerability-like signals may be used only under the taxonomy, purpose, confirmation, assurance, and risk-review rules, and any rare combination of visible fields/factors/cohort labels must be coarsened or withheld before surfacing.
8. Before scoring or surfacing any candidate, the helper applies candidate-side exposure, subject-identity, and entity-resolution gates: the candidate profile must be active, not paused or deleted, and its current, separately confirmed, unexpired inbound-delegate settings must authorize this delegate's purpose category, audience scope, cohort, and allowed surfaces. The candidate identity, organization, automation status, service-account status, or collective profile must be self-claimed, independently verified, or operator-confirmed for this lane; imported aliases, contact-book records, partner-provided names, model-suggested agent status, or ambiguous duplicate links are not matchable identities. General broad-profile discoverability alone must never be treated as consent to delegate-mediated background surfacing, and stale or expired candidate exposure consent blocks surfacing until the candidate re-confirms.
9. Before scoring or surfacing any candidate, the helper also applies candidate-side burden controls and power-asymmetry gates: the candidate's per-purpose/per-scope surfacing budget, pending-intro limit, and cool-off state must permit another surface or intro path. Exhausted budgets block surfacing until the window resets or the candidate explicitly widens the budget. Explicit high-dependency or power-asymmetric contexts, such as funder/grantee, employer/applicant, clinician/client, legal or immigration adviser/client, landlord/tenant, mentor/mentee, platform admin/user, or similar relationship types, require the configured review and consent safeguards before opportunity creation, intro advancement, or disclosure.
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
   - canonical policy-decision id / policy-version snapshot
   - match-input lineage snapshot ids, claim-assurance taxonomy/record snapshots, and quasi-identifier redaction state
   - redacted delegate receipt id
   - next-step options
11. Operator or admin review may add blockers, mark the brief stale, quarantine the artifact, or approve a next step only after all hard gates pass. No operator, admin, reviewer, feature flag, or break-glass path may waive requester authorization, candidate exposure consent, purpose-policy compatibility, risk-review coverage, anti-probing controls, retention/anonymization state, or explicit-field-only matching. High-impact governance or safety changes, including broadening purpose-code semantics, approving external risk reviews, releasing emergency stops, activating partner or federation grants, changing aggregate-release policy, or enabling public-broad-preview lanes, require the configured two-person/separation-of-duties approval path and configured conflict-of-interest recusal checks.
12. Operator review uses a least-privilege redacted workbench by default. Exact candidate, requester, source-summary, targeting-rationale, or disclosure-field values may be revealed to an operator only through a just-in-time, field-scoped, reason-coded action with role checks, expiry, audit logging, and no bulk search/export path.
13. Before notification, display, feedback advancement, or intro-request creation, the system checks scoped emergency stop controls. Any active applicable stop blocks the action, cancels or pauses pending runs, suppresses notifications, and marks dependent active briefs stale or emergency-paused until explicitly released through a redacted safety action.
14. Notifications are generic, freshness-bound, processor-minimized, and respect participant-owned attention controls such as digest frequency, quiet hours, channel preferences, and maximum non-critical notification volume. They never include exact wishes, source notes, contact details, private constraints, or counterparty-specific sensitive content; notification preferences may only narrow or batch delivery and must not force immediate candidate-specific sends, catch-up sends after stale queue backlogs, or override side-channel-safe cadence. If an external processor or delivery provider is used, the payload and metadata must pass the external-processor policy, output-schema, queue-freshness, and side-channel-safety gates before enqueue or send.
15. No-result, withheld, low-confidence, or blocked-run states are also generic. Requester-visible no-result responses, digest changes, receipt timing, queue timing, and notification absence must not reveal whether a candidate exists or was filtered by a candidate-specific gate; use fixed digest windows, jitter, rate limits, cross-account/partner-seat anti-probing controls, and generic “no privacy-safe opportunity surfaced” language. Payment tier, partner status, and engagement likelihood must not change ranking, surfacing, or notification priority.
16. The participant can dismiss, defer, decline without giving a reason, choose not-now, report, create a private do-not-match / block / mute preference where the UI supports it, set notification/digest preferences, submit a correction request about their own background-networking data, or request an introduction. Non-disclosing participant mistakes should have cancel/back or safe reversal paths where reversal does not create consent, resurrect stale artifacts, disclose counterparties, or bypass fresh revalidation. High-impact consent or disclosure actions require recent step-up authentication or repository-equivalent reauthentication before activation.
17. Feedback and action events are not implicit profile-learning signals. Views, dismissals, deferrals, reports, receipt clicks, intro requests, dwell time, and notification interactions may update only the relevant action state, retention/cool-off state, and redacted safety workflows unless the participant explicitly confirms a schema-bound broad profile update.
18. Every display or action revalidates the brief’s dependency snapshot and the active artifact-dependency graph; if an authorization, profile scope, source summary, confirmed tag, candidate exposure setting, candidate discoverability state, cohort boundary, grant, hold, freeze, emergency-stop state, manifest/bundle hash, or expiry window has changed, the brief becomes stale and cannot advance to an intro request. Missing dependency edges, stale-propagation failures, or delayed invalidation worklists block affected displays/actions until recomputed from current inputs.
19. Stale, closed, dismissed, reported, blocked/muted, revoked, or expired artifacts enter a retention lifecycle: after the participant-visible review window and any safety-review hold, candidate references and free-text content are deleted or anonymized, queued notifications are suppressed, and requester/counterparty-visible caches, exports, UI hydration payloads, and outbox rows are purged or marked stale, while only redacted/anonymized audit rows may remain.
20. Intro-request targets are derived server-side from the active opportunity brief; requester clients never supply or receive exact counterparty identifiers during the request, operator-review, or counterparty-pending stages. Requester-facing intro-request status uses sanitized generic labels and side-channel-safe timing.
21. If operator review permits a counterparty-facing intro-consent request, that request uses a separate sanitized allowlist schema and minimum-necessary broad context. It must not reveal the requester's exact identity, contact details, exact wishes, source notes, private cohort membership, or exact targeting reason before the counterparty has opted into the next consent stage.
22. Counterparty-facing intro-consent notifications and reminders are system-controlled, rate-limited, and budgeted, and counterparty decline/not-now/no-reason exits remain low-friction and non-punitive. Requesters must not be able to trigger reminders, observe reminder timing, or distinguish ignored, timed-out, declined, reported, or request-more-context outcomes before the relevant consent stage.
23. Intro-request creation and interested-feedback advancement are idempotent per requester-owned opportunity brief and inherited purpose-code/version pair; retries, duplicate clicks, queue replays, or malicious replays return the same sanitized state or a generic conflict without creating duplicate intro requests, receipts, budget reservations, operator queue items, or notifications.
24. Only after mutual consent and operator review can exact fields be disclosed, and only through explicit, time-bounded, revocable field-level grants tied to the inherited purpose-code/version and intro request. Grants are non-transitive and cannot be reused for matching, ranking, future unrelated intros, telemetry, exports, or broader profile enrichment. Exact-field access should use short-lived server-rendered views or repository-equivalent expiring access; recipient acknowledgement and copy/download limits apply where configured, and the UI must distinguish future-access revocation from retroactive erasure of information already viewed. The default first-contact path after mutual consent is a mediated contact relay or repository-equivalent privacy-preserving session with explicit boundary settings; exact external contact details require a separate field-level disclosure grant and must not be bundled into the relay by default.
25. New non-staff lanes, new high-sensitivity signal classes, new high-impact claim classes, new federation or partner-matchmaker workflows, and public-broad-preview expansions start in shadow or staff-only canary mode with no ordinary-user-facing surfacing, notifications, counterparty prompts, or disclosure. They can promote only under a current pilot-evaluation record, current adversarial risk review, no blocking tripwire or emergency stop, passed conflict-of-interest and dual-control checks where configured, and any required independent adversarial safety-case / red-team signoff. If pre-registered harm, burden, false-match, privacy, latency, or utility thresholds fail, the lane sunsets or rolls back rather than remaining indefinitely in partial launch.
26. Non-surfaced candidate evaluations are ephemeral. Rejected candidates, near-miss scores, blocked-candidate lists, and per-candidate factor vectors from a run must be discarded after the policy decision and budget/quota effects are applied, except for minimum-necessary redacted aggregate safety rows or valid active safety/legal holds. Backup, snapshot, restore, search-index, and warehouse processes must not resurrect redacted, anonymized, expired, or revoked artifacts into active matching or disclosure paths.

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


## Implementation phasing and fail-closed stubs

Codex should not try to expose the whole mature background-networking system in one deploy. Build the mechanism as a sequence of auditable, fail-closed phases.

Codex must declare the current target phase in the implementation notes, documentation, and tests. That declaration must come from a single server-side governed current-phase artifact, bound into the active release/config manifest and consumed by the policy evaluator. Acceptance is phase-scoped: enabled surfaces must be fully implemented for the current phase, while future-phase surfaces must be unreachable except through explicit generic deny/stale/unavailable responses. A future-phase table, route, worker, UI panel, queue, export path, telemetry path, or test file must not be added as a placeholder if it could be mistaken for a working lane. Placeholder code is acceptable only when it is a fail-closed stub with tests proving that it cannot enqueue work, score candidates, surface opportunities, send notifications, create intros, disclose fields, export data, or emit sensitive telemetry. If documentation, tests, feature flags, route availability, worker registration, or policy decisions disagree with the current-phase artifact, the affected lane must fail closed until the mismatch is resolved by a governed release/config change.

Phase 0 — policy skeleton and disabled surfaces:

- inventory existing Background Networking routes, contracts, validators, tables, feature flags, outboxes, telemetry, exports, and docs;
- add or adapt the central policy-decision interface, output-schema allowlists, release/config manifest checks, state-transition guards, and retention/cache invalidation hooks needed by later phases;
- create explicit disabled stubs for non-MVP surfaces so unsupported actions return generic deny/stale/unavailable states rather than falling through to partial implementations;
- add tests proving that partner-matchmaker, federation, public-broad-preview, high-sensitivity signal, high-impact claim, aggregate-release, vault-reveal, source-summary import, LLM interview, and intro-disclosure lanes fail closed until their phase-specific gates are implemented.

Phase 1 — internal/staff-only core delegate:

- implement opt-in, structured wish profile, time-bounded delegate authorization, separately confirmed candidate exposure, deterministic explicit-signal matching, sanitized opportunity briefs, generic participant notifications, redacted receipts, staleness, revocation, anti-probing floors, and retention cleanup;
- use only cohort/internal broad-profile signals; no source-summary-derived matching, LLM proposal path, partner access, federation, public-broad-preview search, vault reveal, or exact-detail disclosure;
- keep ordinary users, partner systems, candidate-facing prompts, and public-broad-preview lanes off.

Phase 2 — reviewed source summaries and intro-request skeleton:

- add manual source summaries, tag confirmation, third-party-data minimization, and source-summary retention only after Phase 1 tests pass;
- add interested feedback and server-derived intro requests, but keep counterparty-facing prompts and exact disclosure behind operator review, mutual consent, field-level grants, and phase-specific tests.

Phase 3 — tiny consenting cohort / partner-matchmaker pilots:

- enable only named cohorts or named partner grants that have current risk reviews, pilot-evaluation records, adversarial safety cases, quota limits, and rollback owners;
- keep public-broad-preview, federation, and high-sensitivity/high-impact lanes disabled unless separately promoted.

Phase 4 — higher-power lanes:

- treat federation, public-broad-preview, high-sensitivity vulnerability signals, high-impact claim assurance, vault reveal, aggregate reporting, and external partner callbacks as separate promotions requiring their own implementation tasks, red-team/safety-case artifacts, and release-manifest approvals.

A phase is not complete merely because UI exists. It is complete only when unsupported downstream surfaces fail closed, tests cover disabled and enabled behavior, documentation states the current phase, and production defaults cannot accidentally expose an unimplemented or partially implemented lane.

## Core mechanism

Implement a background delegate loop with this invariant-preserving flow:

1. Participant enters a staged, task-based Background Delegate onboarding/control-center flow and opts into Background Networking only after seeing the current phase, what is enabled/disabled, what data can become a match input, what remains hidden, expiry/reconfirmation rules, and revocation effects. Any first enablement or later scope broadening must be preceded by a server-derived effective-permission preview and before/after consent diff.
2. Participant grants a time-bounded delegate authorization covering allowed purpose codes, allowed surfaces, audience/cohort scope, run budget, maximum briefs, minimum confidence band, notification/digest behavior, and revocation controls. Higher-risk authorization, exposure, budget, export, disclosure, privacy-freeze-release, or notification-broadening choices must use neutral no-dark-pattern consent copy, a server-derived current-vs-proposed permission diff, and an explicit comprehension/confirmation event bound to the preview version.
3. Participant creates or updates a structured wish profile through explicit fields and, where enabled, a schema-bound fluent interview.
4. Participant may add a manual or imported source summary. Raw private feeds must not be continuously ingested, searched, copied into analytics, or used directly for matching. Raw source material, exact wishes, exact source summaries, and exact disclosure-granted fields must remain behind the participant-owned sensitive-data vault / key-isolation boundary; deterministic matching receives only confirmed broad signals and redacted policy outputs.
5. Only participant-approved broad signals become match inputs. Hidden embeddings, latent preference vectors, unreviewed model summaries, and uninspectable derived features must not influence matching or surfacing. Every match input must have a current signal-taxonomy classification and active match-input lineage to a current confirmation/source/profile version; high-sensitivity/vulnerability-like signals require the additional confirmation, purpose, risk-review, and generic-output gates defined below.
6. A deterministic background helper run searches broad wish-registry previews and approved broad profile signals within the active authorization scope, under exactly one allowlisted purpose code selected from the active authorization. Partner-matchmaker runs must reference a named active partner grant; collective-profile runs must validate representative authority and member-data minimization before scoring or surfacing. Each helper run must execute under an allowlisted tool-capability profile for the exact action kind, with no unregistered tools or unreviewed external side effects.
7. The helper run enforces a minimum eligible-pool floor, repeated-candidate dedupe, count bucketing, signal-taxonomy and lineage gates, quasi-identifier / rare-combination redaction checks, and query/profile-variant anti-probing controls before scoring candidates.
8. Before scoring or surfacing any candidate, the helper run enforces candidate-side exposure consent and conservative entity-resolution: the candidate profile must be active, self-claimed or independently verified for the relevant person/organization/collective, and its current, separately confirmed, unexpired inbound-delegate settings must authorize this delegate's purpose category, audience scope, cohort, and allowed surfaces. General broad-profile discoverability, imported aliases, contact records, partner-provided names, or ambiguous duplicate links do not authorize delegate-mediated discovery, and expired or stale exposure confirmations are hard blockers until re-confirmed by the candidate.
9. Before scoring or surfacing any candidate, the helper run enforces candidate-side burden controls: the candidate's current per-purpose/per-scope surfacing budget, pending-intro limit, and cool-off state must permit another exposure or intro path. Exhausted or missing required budgets are hard blockers.
10. If a candidate match passes eligibility, safety, anti-collusion, anti-enumeration, purpose-compatibility, cohort-scope, candidate-exposure, entity-resolution, match-input-lineage, quasi-identifier, dependency-validity, uncertainty-gating, and threshold checks, create a privacy-safe opportunity brief with redacted requester-facing dependency labels, internal-only candidate exposure/dependency snapshots for server revalidation, a sanitized participant-facing projection/DTO, a versioned requester-facing output-schema allowlist that rejects extra keys, a canonical policy-decision id / policy-version snapshot, match-input lineage snapshot ids, quasi-identifier redaction state, and a participant-visible receipt.
11. Apply the centralized policy-decision evaluator before any delegate run, scoring pass, opportunity creation, notification, display, feedback advancement, intro flow, disclosure grant, cache render, export, outbox send, or retention cleanup. Operator/admin actions may only narrow, suppress, quarantine, mark stale, reject, or approve a next step after all hard gates pass; they must not override consent, purpose, risk-review, anti-probing, retention, or explicit-signal requirements. High-impact governance/safety changes require configured separation-of-duties approval and must fail closed without it.
12. Use least-privilege operator review by default. Operator workbenches must show redacted queue views unless a specific field-level reveal is justified, reason-coded, role-authorized, time-bounded, and audited.
13. Apply scoped emergency stop controls before notification, display, feedback advancement, intro-request creation, candidate-facing exposure, or any new delegate run. An active applicable stop blocks the action and must fail closed.
14. Notify the participant with generic copy only.
15. Return or display generic no-result, withheld, low-confidence, and blocked-run states only on a side-channel-safe cadence. Do not expose immediate no-match reasons, receipt/queue timing, notification absence, or digest-count deltas that distinguish candidate absence from candidate opt-out, budget exhaustion, cool-off, cohort mismatch, privacy-stage conflict, retention state, or another candidate-specific gate.
16. Participant can dismiss, defer, report, set notification/digest preferences, file a correction request about their own background-networking data, or request an intro. Non-disclosing participant mistakes should have cancel/back or safe reversal paths where reversal does not create consent, resurrect stale artifacts, disclose counterparties, or bypass fresh revalidation. High-impact participant actions such as broad exposure, budget widening, sensitive-tag confirmation, vault reveal, and disclosure grants require recent step-up authentication or repository-equivalent reauthentication.
17. Treat feedback and action events as action state, retention/cool-off input, and redacted safety signals only. Do not silently turn views, dismissals, deferrals, reports, receipt clicks, intro requests, dwell time, notification interactions, or other behavioral events into matching features, hidden preferences, profile completeness, ranking signals, candidate reputation, or engagement optimization.
18. Before display or feedback, revalidate the brief’s authorization, profile, source-summary, cohort, candidate-exposure, candidate-discoverability, emergency-stop state, and expiry dependencies; stale briefs must not be actionable.
19. When a run, brief, feedback item, receipt, intro request, disclosure grant, cached projection, queued notification, export snapshot, or client-visible payload becomes closed, stale, expired, dismissed, reported, blocked/muted, revoked, or deleted, apply its retention and cache-invalidation policy: purge, suppress, or anonymize linkable candidate references, exact field values, stale sanitized payloads, and free-text content after the review window, preserving only redacted/anonymized safety audit rows where policy permits.
20. Intro requests remain operator-reviewed and mutual-consent gated before any exact wishes, contact details, sensitive constraints, source notes, or private counterparties are disclosed. Intro targets must be derived server-side from a valid active opportunity brief; requester clients must not supply or receive exact counterparty identifiers, internal brief identifiers beyond requester-owned receipt/brief ids, or candidate-specific intro-state reasons before the relevant consent stage.
21. Counterparty-facing intro-consent prompts must be sanitized and minimum-necessary: before mutual consent, they may show only broad purpose, broad requested disclosure categories, generic safety/review status, and coarse next-step choices, never the requester's exact identity, contact details, exact wishes, source notes, private cohort membership, or exact targeting reason unless a later consent grant authorizes it.
22. Counterparty-facing intro-consent notifications and reminders must be system-controlled, rate-limited, budgeted, generic, and side-channel-safe. Requester clients must not trigger reminders or learn exact reminder/engagement state.
23. Interested-feedback advancement and intro-request creation must be idempotent for the same requester-owned brief and inherited purpose-code/version pair, including under client retries, queue retries, duplicate submissions, and malicious replays.
24. Exact post-mutual-consent disclosure must be mediated by explicit, field-level, purpose-bound, time-bounded, revocable grants. Mutual consent alone must not create broad, permanent, transitive, or reusable access to exact wishes, source notes, contact details, or private constraints.

Use or extend existing Background Networking tables, routes, validators, and tests if present. Do not fork the domain model unnecessarily.

## Hard invariants

- Broad previews before exact private details.
- Exact details move only through field-level, purpose-bound privacy grants.
- The current implementation phase is a governed policy input, not prose. A repository-standard server-side phase artifact must name the active Background Networking phase and the lanes allowed in that phase. The active release/config manifest, policy evaluator, route registration, worker registration, feature-flag defaults, docs, and tests must all validate against that same phase artifact. A phase mismatch, missing phase record, stale phase bundle, client-supplied phase claim, or docs/code/test divergence is a hard blocker for the affected lane.
- Phase-gate bundles are content-addressed, append-only, and manifest-bound. The active release/config manifest must bind both the phase-gate bundle version and a canonical content hash over the complete lane matrix. Activated bundle rows must not be broadened, rewritten, deleted, or reinterpreted in place. Any change that widens a lane, changes allowed action kinds, changes feature-flag requirements, changes risk-review or pilot-evaluation requirements, or changes requester/counterparty-visible unavailable behavior requires a new bundle version/hash and governed manifest activation. Hash mismatch, partial bundle materialization, stale bundle rows, client-supplied bundle claims, or same-version in-place mutation is a hard blocker for the affected lane.
- Partial implementation must fail closed. If a phase, route, worker, table, UI panel, partner callback, export path, LLM path, source-summary path, intro path, disclosure path, aggregate-report path, vault path, or federation path is not fully implemented and covered by its phase-specific policy gates and tests, it must be explicitly unavailable through a generic deny/stale/unavailable response. Stubbed or unimplemented higher-power lanes must not enqueue work, score candidates, create opportunity briefs, send notifications, expose diagnostics, mutate grants, create partner payloads, export data, or rely on TODO comments, hidden client state, stale docs, or feature flags alone for safety.
- Centralized policy decisions are required and fail closed. Every externally meaningful background-networking action, including run enqueue, scoring, candidate surfacing, opportunity creation, display, notification, feedback advancement, intro-request creation, operator approval, field-level disclosure, cache render, export, telemetry emission, and retention cleanup, must call a single canonical policy evaluator or repository-equivalent policy engine. The decision must name the action kind, actor role, participant, purpose-code/version, surfaces, dependency versions, active stops/tripwires/holds, consent states, output schema version, output-schema bundle version/hash, UI-copy bundle version/hash where governed UI/consent/notification/receipt copy is rendered or sent, client-surface integrity policy version/hash where a Background Delegate client surface is rendered, hydrated, cached, or linked, tool-capability bundle version/hash where the action invokes a registered tool or worker capability, signal-taxonomy version/hash where the action evaluates or mutates matchable signals, safety-blocker taxonomy version/hash where the action evaluates prohibited-coordination or safety blockers, claim-assurance taxonomy version/hash where the action evaluates, verifies, relies on, renders, or mutates high-impact claims, retention-policy bundle version/hash where the action creates, retains, anonymizes, deletes, restores, exports, caches, or invalidates background-networking artifacts, aggregate-release policy bundle version/hash where the action publishes, displays, exports, caches, or evaluates aggregate analytics or reports, queue-freshness control version/hash where the action enqueues, delays, sends, retries, or drains pending work, governed-bundle canonicalization profile version/hash for interpreting all manifest-bound hashes, policy-composition bundle version/hash for the composition rules used by the evaluator, artifact-transition policy bundle version/hash where the action changes an artifact state, and release/config manifest id. Missing, stale, wrong-action, partial, client-supplied, or unverifiable policy decisions are hard blockers. Route handlers, workers, operators, feature flags, fixtures, and break-glass paths must not reimplement or bypass the evaluator.
- Policy action kinds are governed, lane-bound, and complete. The policy evaluator must accept only active action kinds from the current policy-action-kind registry or repository-equivalent allowlist bound into the active release/config manifest. Broad catch-all, debug, fallback, generic admin, client-defined, partner-defined, or unregistered action kinds are hard blockers. Every lane that can mutate state, reserve quota, create or stale artifacts, send or suppress notifications, advance feedback, create intros, prompt counterparties, approve operator actions, reveal/decrypt exact fields, call partners, generate exports, emit telemetry, run retention cleanup, activate/release governance controls, or change phase/manifest/gate state must have an explicit action kind mapped to its lane, permitted actor roles, output schema, side-effect class, and single-use/idempotency requirements.
- Policy-action-kind registries are content-addressed, append-only, and manifest-bound. The active release/config manifest must bind both the policy-action-kind registry version and a canonical content hash over the complete sorted action-kind registry. Activated action-kind rows must not be broadened, rewritten, deleted, or reinterpreted in place. Adding an action kind, broadening actor roles or lane kinds, weakening side-effect class, removing single-use/idempotency/output-schema/step-up/review requirements, or changing action-family semantics requires a new registry version/hash and governed manifest activation. Hash mismatch, partial registry materialization, stale action-kind rows, client-supplied action-kind registry claims, or same-version in-place mutation is a hard blocker for the affected action.
- Purpose-code registries are content-addressed, append-only, and manifest-bound. The active release/config manifest must bind both the purpose-registry version and a canonical content hash over the complete sorted purpose-code registry. Activated purpose-code rows must not be broadened, rewritten, deleted, or reinterpreted in place. Adding a purpose, broadening a meaning, widening allowed surfaces, weakening prohibited-use codes, lowering risk tier, weakening operator-review or re-confirmation requirements, or changing public labels/summaries requires a new purpose-registry version/hash and governed manifest activation. Hash mismatch, partial registry materialization, stale purpose rows, client-supplied purpose-registry claims, same-version in-place mutation, or a policy decision whose purpose-registry hash no longer matches the active manifest is a hard blocker for dependent delegate authorizations, candidate exposure settings, delegate runs, opportunity briefs, receipts, intro requests, docs, and tests.
- Signal-taxonomy registries are content-addressed, append-only, and manifest-bound. The active release/config manifest must bind both the signal-taxonomy version and a canonical content hash over the complete sorted signal-taxonomy registry. Activated signal-taxonomy rows must not be broadened, rewritten, deleted, or reinterpreted in place. Adding a signal, lowering sensitivity, removing vulnerability-like classification, widening allowed purpose/surface bindings, weakening step-up/operator/risk-review requirements, changing prohibited uses, or changing public labels requires a new signal-taxonomy version/hash, privacy/safety review where applicable, and governed manifest activation. Hash mismatch, partial taxonomy materialization, stale signal rows, client-supplied taxonomy claims, same-version in-place mutation, or a policy decision whose signal-taxonomy hash no longer matches the active manifest is a hard blocker for matching, tag confirmation, source-summary proposal application, opportunity briefs, notifications, intro requests, disclosure prompts, docs, and tests.
- Claim-assurance taxonomy registries are content-addressed, append-only, and manifest-bound. The active release/config manifest must bind both the claim-assurance taxonomy version and a canonical content hash over the complete sorted claim-assurance taxonomy. Activated claim-assurance taxonomy rows must not be broadened, rewritten, deleted, or reinterpreted in place. Adding a high-impact claim class, lowering minimum assurance level, widening allowed purpose/surface bindings, weakening evidence, expiry, review, or reliance-limit requirements, changing requester/counterparty-safe labels, or changing prohibited reliance uses requires a new claim-assurance taxonomy version/hash, safety or domain review where applicable, and governed manifest activation. Hash mismatch, partial taxonomy materialization, stale claim-assurance taxonomy rows, client-supplied taxonomy claims, same-version in-place mutation, or a policy decision whose claim-assurance taxonomy hash no longer matches the active manifest is a hard blocker for high-impact claim influence, high-confidence opportunity briefs, intro advancement, reliance wording, field-level disclosure, docs, and tests.
- Safety-blocker and prohibited-coordination taxonomies are content-addressed, append-only, and manifest-bound. The active release/config manifest must bind both the safety-blocker taxonomy version and a canonical content hash over the complete sorted safety-blocker taxonomy. Activated safety-blocker rows must not be broadened, rewritten, deleted, or reinterpreted in place. Adding a blocker class, weakening severity, narrowing blocked action families, weakening review requirements, changing requester-safe labels in a way that leaks internal reasons, or allowing a formerly blocked coordination pattern requires a new safety-blocker taxonomy version/hash, safety review, and governed manifest activation. Hash mismatch, partial taxonomy materialization, stale blocker rows, client/partner/operator-supplied blocker claims, same-version in-place mutation, or a policy decision whose safety-blocker taxonomy hash no longer matches the active manifest is a hard blocker for delegate runs, scoring, opportunity briefs, notifications, intro advancement, counterparty prompts, partner/federation callbacks, exports, telemetry, docs, and tests.
- Retention-policy bundles are content-addressed, append-only, and manifest-bound. The active release/config manifest must bind both the retention-policy bundle version and a canonical content hash over the complete sorted retention-policy bundle. Activated retention-policy rows must not be broadened, rewritten, deleted, or reinterpreted in place. Adding a retention class, extending linkable retention windows, widening retained fields, weakening anonymization/deletion/cache-invalidation/outbox-suppression requirements, weakening backup deletion-manifest requirements, or changing non-actionability guarantees requires a new retention-policy bundle version/hash, privacy or legal review where applicable, and governed manifest activation. Hash mismatch, partial bundle materialization, stale retention-policy rows, client-supplied retention-policy claims, same-version in-place mutation, or a policy decision whose retention-policy bundle hash no longer matches the active manifest is a hard blocker for artifact creation, display, notification, intro advancement, disclosure, export, cache render, backup restore, retention cleanup, docs, and tests.
- Output-schema bundles are content-addressed, append-only, and manifest-bound. The active release/config manifest must bind both the output-schema bundle version and a canonical content hash over the complete sorted output-schema registry. Activated schema rows must not be broadened, rewritten, deleted, or reinterpreted in place. Adding a visible key, widening an audience/surface/lane binding, weakening a redaction or bucketing rule, changing an extra-key policy, allowing an internal/debug field, or changing export/telemetry/cache/UI-hydration semantics requires a new schema bundle version/hash, privacy review, and governed manifest activation. Hash mismatch, partial schema materialization, stale schema rows, client-supplied schema claims, same-version in-place mutation, or a policy decision whose output-schema bundle hash no longer matches the active manifest is a hard blocker for the affected render/send/export/cache/telemetry action.
- Tool-capability bundles are content-addressed, append-only, and manifest-bound. The active release/config manifest must bind both the tool-capability bundle version and a canonical content hash over the complete sorted tool-capability registry. Activated tool-capability rows must not be broadened, rewritten, deleted, or reinterpreted in place. Adding a tool, widening allowed action kinds, enabling outbound network access, enabling write access, enabling vault decrypt, increasing maximum input-data class, weakening risk-review requirements, or changing side-effect class requires a new tool-capability bundle version/hash, security or privacy review where applicable, and governed manifest activation. Hash mismatch, partial bundle materialization, stale capability rows, client-supplied capability claims, same-version in-place mutation, or a policy decision whose tool-capability bundle hash no longer matches the active manifest is a hard blocker for the affected delegate run, worker, LLM proposal path, notification builder, partner callback, vault path, export path, telemetry builder, or retention job.
- Side-effecting policy decisions are atomically single-use. An `allow` decision for run enqueue, scoring with quota effects, candidate surfacing, opportunity creation, notification send, feedback advancement, intro creation, counterparty prompting, disclosure grant, cache render, export generation, telemetry emission, retention cleanup, operator approval, partner callback, vault decrypt/reveal, aggregate release, or any other state-mutating or externally delivering action must be consumed by a server-side atomic check-and-set under the exact action idempotency key, release manifest, phase-gate bundle hash, lane key, output-schema version, tool-capability bundle hash where a registered capability is used, signal-taxonomy hash where signal-taxonomy-gated behavior is used, safety-blocker taxonomy hash where safety-blocker-gated behavior is used, claim-assurance taxonomy hash where claim-assurance-gated behavior is used, retention-policy bundle hash where retention-bound behavior is used, aggregate-release policy hash where aggregate-release-bound behavior is used, queue-freshness control hash where enqueue/retry/send/drain behavior is used, governed-bundle canonicalization profile hash, client-surface integrity policy hash where a Background Delegate client surface is rendered/hydrated/cached/linked, UI-copy bundle hash where governed copy is rendered/sent, policy-composition bundle hash, artifact-transition policy bundle hash where transition-bound behavior is used, and dependency snapshot for which it was issued. Already-consumed, replayed, wrong-idempotency-key, wrong-lane, wrong-schema, wrong-tool-capability-bundle, wrong-signal-taxonomy, wrong-safety-blocker-taxonomy, wrong-claim-assurance-taxonomy, wrong-retention-policy-bundle, wrong-aggregate-release-policy-bundle, wrong-queue-freshness-control, wrong-governed-bundle-canonicalization-profile, wrong-client-surface-integrity-policy, wrong-ui-copy-bundle, wrong-policy-composition-bundle, wrong-artifact-transition-policy-bundle, wrong-manifest, stale-dependency, or client/partner/operator-supplied decisions are hard blockers. Read/display decisions may be short-lived and revalidated, but they are output-bound and must not be reused to perform later side effects.
- Governed-bundle hashes require a single manifest-bound canonicalization/materialization profile. A content hash over phase gates, action kinds, purpose codes, signal taxonomy, safety-blocker taxonomy, claim-assurance taxonomy, output schemas, UI copy, tool capabilities, retention policy, aggregate-release policy, queue-freshness controls, policy composition, or artifact transitions is valid only when recomputed under the active governed-bundle canonicalization profile. The profile defines complete row materialization, environment/scope/status filters, included fields, ordering, null/empty/default handling, timestamp and number encoding, Unicode normalization, and hash algorithm. Missing, stale, partial, non-deterministic, client/operator-supplied, wrong-profile, or same-version-mutated canonicalization fails closed for every dependent policy decision, route, worker, UI screen, export, telemetry path, retention job, docs page, and test.
- Release/config provenance is mandatory for policy-critical actions. The active policy engine, governed-bundle canonicalization profile, policy-composition bundle, artifact-transition policy bundle, policy-action-kind registry, purpose-code registry, signal-taxonomy registry, safety-blocker taxonomy registry, claim-assurance taxonomy registry, retention-policy bundle, aggregate-release policy bundle, queue-freshness control bundle, artifact-dependency policy, external-processor policy, sensitive-audit-chain policy, output-schema bundle, UI-copy bundle, client-surface integrity policy, tool-capability bundle, database migrations, feature-flag defaults, and retention/backfill jobs must be bound into a current immutable or signed release/config manifest by version and content hash where the spec defines a hash. A route, worker, queue consumer, partner callback, operator workbench, export job, telemetry builder, or retention cleanup job must fail closed if its manifest is missing, stale, unapproved, wrong-environment, wrong-scope, or inconsistent with the policy-decision record. Rollback must use an approved prior manifest and must not re-enable deprecated purpose semantics, stale output schemas, revoked tools, deleted migrations, or previously anonymized linkable data.
- Policy composition is least-permissive. When requester authorization, candidate exposure, source-summary confirmation, field-level disclosure grant, safety preference, privacy freeze, retention hold, emergency control, runtime tripwire, partner/federation grant, aggregate-release policy, subject-identity authority, power-asymmetry review, vault policy, output schema, or rollout rule overlap, the effective permission is the intersection of all applicable current controls. Any denial, pause, expiry, missing binding, narrower scope, ambiguity, or version mismatch overrides a broader allow. No feature flag, admin action, rollback, migration, partner callback, or cached policy decision may reinterpret an allow as broader than the narrowest active governing control.
- Policy-composition bundles are content-addressed, append-only, and manifest-bound. The active release/config manifest must bind both the policy-composition bundle version and a canonical content hash over the complete sorted composition-rule bundle. Activated composition-rule rows must not be broadened, rewritten, deleted, or reinterpreted in place. Adding a non-waiver exception, broadening a composition mode, weakening deny-overrides, weakening conflict behavior, changing control-family applicability, or allowing a broader cached/partner/operator/rollback permission requires a new policy-composition bundle version/hash, safety review where applicable, and governed manifest activation. Hash mismatch, partial bundle materialization, stale composition rows, client-supplied composition claims, same-version in-place mutation, or a policy decision whose policy-composition bundle hash no longer matches the active manifest is a hard blocker for affected policy decisions, state changes, renders, sends, exports, telemetry, retention jobs, docs, and tests.
- Artifact state transitions are governed and non-resurrecting. Every stateful artifact type must have a canonical transition policy. A transition from stale, closed, expired, redacted, anonymized, released, revoked, paused, frozen, declined, or deleted into an actionable state is forbidden unless the transition policy explicitly says to recompute a new artifact from currently valid inputs. Admin tools, migrations, replay jobs, retention jobs, backup restores, and rollback paths must not bypass transition guards.
- Artifact-transition policy bundles are content-addressed, append-only, and manifest-bound. The active release/config manifest must bind both the artifact-transition policy bundle version and a canonical content hash over the complete sorted transition-policy bundle. Activated transition-policy rows must not be broadened, rewritten, deleted, or reinterpreted in place. Adding a transition, broadening actor roles, reducing preconditions, weakening non-actionability guarantees, removing required receipts/audit rows, removing stale/cache/outbox/retention side effects, or adding any resurrection path requires a new artifact-transition policy bundle version/hash, high-impact governance approval where applicable, and governed manifest activation. Hash mismatch, partial bundle materialization, stale transition-policy rows, client-supplied transition claims, same-version in-place mutation, or a policy decision whose artifact-transition bundle hash no longer matches the active manifest is a hard blocker for affected state changes, replay jobs, migrations, rollback paths, retention jobs, docs, and tests.
- Artifact dependency tracking and stale propagation are first-class safety controls. Every active delegate run, opportunity brief, intro request, disclosure grant, receipt, screen-state DTO, effective-permission preview, outbox row, export, cache payload, partner/federation payload, mediated contact session, and audit-sensitive operator action must either record dependency edges to the current consent, source, candidate-exposure, grant, hold, freeze, emergency-control, manifest, bundle-hash, and retention inputs it relies on, or be explicitly marked as inert/non-actionable. Revocation, correction, expiry, policy/bundle replacement, privacy freeze, emergency stop, retention cleanup, entity-resolution change, subject-identity change, or exposure/budget change must enqueue stale propagation and invalidate dependent actions before any render/send/export/intro/disclosure/relay side effect. Missing edges, stale edge policies, failed stale propagation, stuck invalidation queues, or dependency graphs that cannot be recomputed from current inputs fail closed.
- Sensitive source and exact-field data are vault-bound. Raw source text, exact source summaries, exact wishes, contact fields, private constraints, exact post-consent disclosure fields, and sensitive operator-reveal payloads must live in a participant-owned encrypted vault or repository-equivalent sensitive-field store with purpose-scoped keys, just-in-time decrypt, strict field grants, and no bulk query/export/search path. Central matching, telemetry, analytics, public reports, partner views, and ordinary operator queues receive only confirmed broad signals, redacted outputs, or sanitized projections.
- Stable identity/contact resolution is separated from matching. Delegate runs, scoring, anti-probing, receipts, telemetry, policy decisions, and non-surfaced candidate evaluation must use run-scoped pseudonymous candidate handles or repository-equivalent blinded references rather than stable account/profile/contact identifiers. These handles must be unjoinable across runs except through retention-bound internal safety/quota controls, and they must be resolvable to stable identities only by a narrow identity/contact service after a fresh action-specific policy decision for operator review, mutual consent, disclosure, or legally required safety handling.
- Subject identity and automation status are explicit, authority-bound, and non-deceptive. Every matchable participant subject must be classified as an individual, organisation, collective, automated agent, service account, or partner/operator role under a participant-visible subject-identity record. Non-human, organisational, collective, automated-agent, service-account, and partner/operator subjects require current representative authority, human accountability, scope, expiry, and sanitized disclosure labels before surfacing, intro prompts, counterparty prompts, or disclosure grants. Automated or organisational subjects must not masquerade as individuals, and exact identity or contact details still require the normal consent stage.
- Participant privacy freeze is a hard gate. A participant-controlled account-wide freeze or panic pause must immediately block outbound delegate runs, inbound delegate surfacing, queued notifications, candidate-facing consent prompts, feedback advancement, intro-request creation, disclosure-grant access, vault reveal, partner/federation output, exports, cache renders, and nonessential operator reveal for that participant. Freeze activation and existence are requester-/counterparty-safe: other participants receive only generic unavailable/stale/recompute labels. Activation must be reachable from every Background Delegate screen and must not require step-up authentication, reason text, multi-step confirmation, or support contact; release or narrowing requires step-up authentication or repository-equivalent reauthentication, fresh consent/dependency validation, and stale dependent artifacts remain non-actionable until recomputed.
- Background-networking data is not model-training or engagement-optimization data. Raw/exact data, broad signals, source-summary proposals, confirmed tags, match outcomes, opportunity briefs, receipts, feedback/action events, reports, operator decisions, intro states, disclosure grants, telemetry, and aggregate labels must not be used for model training, fine-tuning, embedding training, behavioral personalization, recommender training, ad targeting, growth ranking, engagement optimization, or product-analytics feature learning. Any narrow research/evaluation exception requires separate explicit opt-in where applicable, a current risk review, synthetic/redacted data by default, no raw/source/vault fields, and no conversion into match inputs without the ordinary participant confirmation path.
- Participant data access, export, and portability are non-disclosing. Participant-facing exports may include only the participant's own contributed fields, authorizations, consent/confirmation events, source-summary metadata and confirmed broad tags, exposure settings, disclosure grants, privacy-freeze state, safety preferences, and redacted receipts through versioned sanitized schemas. Exports must not include candidate/counterparty identifiers, hidden blockers, exact gate outcomes, internal policy decisions, abuse heuristics, private cohort membership, rare-combination internals, partner-seat data, vault ciphertext, raw source text, or any field that would reveal another person's private state. Export generation and download require fresh policy decisions, short-lived URLs, retention checks, revocation/freeze invalidation, and no `select *` or internal-row serialization.
- Background Delegate client surfaces are browser-isolated and URL-safe. Consent, source-summary, opportunity, intro, disclosure, freeze, export, and receipt surfaces must satisfy a governed client-surface integrity policy: strict Content Security Policy, no third-party scripts/resources by default, no sensitive ids or consent state in URLs or query strings, no referrer leakage to external origins, no persistent service-worker/offline cache for sensitive payloads, no debug route parameters on sensitive screens, no unreviewed iframes, no broad browser storage, and short-lived opaque route tokens where links are needed. A route, dashboard panel, notification link, export page, or UI hydration path that violates the active client-surface integrity policy fails closed.
- Background Delegate UI instrumentation is first-party, allowlisted, and content-minimized. Consent, source-summary, opportunity, intro, disclosure, freeze, export, and receipt surfaces must not load third-party analytics pixels, session replay, heatmaps, full DOM snapshots, screenshots, screen recordings, keystroke logging, mouse/scroll path tracking, or behavioral A/B systems. Allowed UI telemetry must use versioned schemas, redacted event names, short retention, no page content, no form contents, no exact copy text, and no candidate/counterparty-specific timing or gate outcomes.
- External processors and delivery providers are governed and minimum-necessary. Email, SMS, push, CDN, logging, error-monitoring, fraud, support, translation, accessibility, or other external processors may touch Background Delegate payloads or metadata only through a named active processor policy covering processor identity, allowed lanes, data classes, output schemas, retention, subprocessors, delivery telemetry, incident access, and revocation. Processors must not receive raw source text, exact wishes, exact contact fields, candidate/counterparty identifiers, candidate-specific gate labels, hidden blocker reasons, message content, rare-combination internals, or delivery/open/click states that create side channels. Missing, expired, wrong-lane, wrong-processor, overbroad, or client/processor-supplied processor claims fail closed.
- Decline, not-now, let-expire, and no-reason exits are first-class user choices. Requesters and counterparties must be able to decline, defer, let an item expire, or choose not-now without giving a reason, without confirm-shaming, without loss-framed copy, and without exposing the choice as a candidate-specific signal to the other side. These actions may update only action state, burden/cool-off state, redacted receipts, participant-owned preferences, or safety workflows; they must not become reputation, popularity, quality, engagement, or matching signals unless a participant explicitly confirms a schema-bound broad profile update.
- Aggregate analytics and public reporting are privacy-budgeted. Any aggregate dashboard, partner report, public metric, telemetry export, measurement query, or analyst notebook touching background-networking artifacts must use a registered aggregate-release policy from the active content-addressed aggregate-release policy bundle, with minimum cohort thresholds, query/version logging, suppression or noise where needed, differencing protections across repeated releases, and redacted reviewer approval for sensitive lanes. Ad-hoc analytics over internal rows, candidate identifiers, exact blocker states, exact timing, or sparse cohorts are forbidden.
- Aggregate-release policy bundles are content-addressed, append-only, and manifest-bound. The active release/config manifest must bind both the aggregate-release policy bundle version and a canonical content hash over the complete sorted aggregate-release control bundle. Activated aggregate-release rows must not be broadened, rewritten, deleted, or reinterpreted in place. Adding a query family, lowering minimum group size, widening scope, weakening suppression/noise/differencing requirements, extending expiry, weakening review requirements, changing released metric semantics, or weakening revocation invalidation requires a new aggregate-release policy bundle version/hash, privacy review where applicable, and governed manifest activation. Hash mismatch, partial bundle materialization, stale aggregate-release rows, client/analyst/partner-supplied aggregate-release claims, same-version in-place mutation, or a policy decision whose aggregate-release policy hash no longer matches the active manifest is a hard blocker for dashboards, partner reports, public metrics, telemetry exports, measurement queries, research extracts, docs, and tests.
- Pilot evaluation is pre-registered and non-engagement-optimizing. Non-staff, partner, broader-cohort, high-sensitivity, federation, and public-broad-preview lanes require current evaluation records with explicit utility, safety, privacy, burden, false-match, candidate-burden, report/overrule, and rollback/sunset thresholds. Evaluation may use aggregate participant surveys, mutually reported post-intro usefulness, operator-review quality, false-match rates, report/overrule rates, opt-out rates, and burden rates, but it must not feed dwell time, click-through, payment tier, partner priority, notification opens, or engagement likelihood into eligibility, score, surfacing, notification priority, intro advancement, disclosure, or profile enrichment.
- Matchable fields and tags are sensitivity-tiered and high-impact claims are assurance-tiered. Every field or tag that can influence eligibility, scoring, surfacing, notifications, opportunity briefs, feedback advancement, or intro requests must map to a maintained signal taxonomy with a sensitivity tier, allowed purposes, allowed surfaces, confirmation requirements, and prohibited uses. High-impact claims about credentials, authority, funds, institutional affiliation, legal/medical/immigration expertise, fiscal sponsorship, scarce resources, or safety-relevant capabilities must also map to a current content-addressed claim-assurance taxonomy entry with evidence/verification state, expiry, allowed purposes, and reliance limits. Unclassified, deprecated, stale, under-assured, expired, or policy-mismatched signal/claim classes are hard blockers. High-sensitivity or vulnerability-like signals, including signals about acute financial distress, health, safety needs, legal/immigration risk, dependency, coercion exposure, personal crisis, or similarly exploitable constraints, must not increase score or urgency merely because they reveal need. They require explicit step-up confirmation, purpose compatibility, a current risk review for the lane, genericized requester/counterparty outputs, and operator review where the taxonomy requires it.
- Power-asymmetry and dependency contexts require explicit safeguards. If confirmed broad signals, claim-assurance records, subject-identity records, partner grants, source-summary metadata, or participant safety preferences indicate a high-dependency relationship such as funder/grantee, employer/applicant, landlord/tenant, clinician/client, legal or immigration adviser/client, mentor/mentee, platform admin/user, regulator/regulated party, or similar repository-defined asymmetry, the match must pass a purpose-compatible power-asymmetry review before opportunity creation, intro advancement, counterparty prompting, or disclosure. These contexts must not receive urgency, scarcity, vulnerability, or payment boosts, and requester/counterparty-visible labels must remain generic and side-channel-safe.
- Field-level disclosure UX must be honest about recipient access and revocation limits. Exact-field grants should use short-lived server-rendered access or repository-equivalent expiring views, require recipient acknowledgement of the purpose-bound use boundary before viewing where product scope permits, disable bulk download/copy affordances by default unless separately granted, and expose only coarse access-state labels to participants. Revocation blocks future access and cleanup of controlled surfaces, but the UI must not imply that previously viewed information can be erased from a human recipient's memory or from external copies outside the controlled system.
- Field-level disclosure grants are explicit, minimal, time-bounded, revocable, and non-transitive. A grant must name the grantor, recipient, inherited purpose code/version, intro request, exact field keys, expiry/review window, revocation path, and retention policy. Mutual consent, operator approval, or contact approval must not by itself create broad access to all profile fields, raw source notes, future profile changes, unrelated purposes, future matches, analytics exports, or matching inputs.
- Mediated first-contact relay is the default post-mutual-consent contact path. A mutual-consent intro should open a purpose-bound, retention-bound mediated session or repository-equivalent contact relay before exact external contact fields are disclosed. Relay sessions must not reveal email, phone, external accounts, exact location, or full profile identity unless a separate field-level disclosure grant authorizes those field keys. Relay copy must show boundaries, expiry, revocation/block/freeze controls, no-reason exit options, and whether messages are operator-reviewable under policy. Relays must be rate-limited, side-channel-safe, attachment/link-restricted by default, output-schema-bound, queue-freshness-bound, and excluded from message-content telemetry, model training, engagement optimization, and candidate/requester scoring.
- Renewal, expiry, and safety-check reminders are non-coercive. Time-bounded authorizations, inbound exposure settings, budgets, high-sensitivity tag confirmations, source-summary tags, disclosure grants, partner/public exposure, and exact-data exports should expire safely by default. Renewal prompts must be neutral, batched or digest-based where possible, side-channel-safe, optional where safe, and must present pause, narrow, revoke, or let-expire paths at least as prominently as renew/broaden paths. Renewal copy must not use loss aversion, urgency, popularity, or opportunity-withholding pressure to keep broad permissions active.
- High-impact consent must be neutral, legible, and no-dark-pattern. Public-broad-preview exposure, partner-matchmaker exposure, high-sensitivity/vulnerability signal confirmation, collective authority, candidate budget widening, field-level disclosure grants, vault decrypt reveals, and any scope broadening must show the concrete data surfaces, audience, purpose-code/version, expiry, revocation effect, and likely notification/disclosure consequences. These flows must not use default-on choices, bundled unrelated consents, deceptive urgency, preselected broad scopes, confirm-shaming, hidden revocation paths, or engagement-optimized copy. Repository-defined high-risk flows require an explicit comprehension/confirmation event before becoming active.
- High-impact live changes require server-derived effective-permission previews. Before a participant activates, broadens, renews, revokes, freezes, releases, confirms, exports, requests an intro, widens notifications, or grants disclosure in a way that changes live permissions or delivery, the server must render a current-vs-proposed diff using the active policy evaluator, phase gate, output schema, UI-copy bundle, purpose registry, signal taxonomy, retention policy, notification preferences, and policy-composition rules. The preview may show only participant-owned data categories, broad purpose/surface/audience labels, newly enabled/disabled surfaces, expiry/reconfirmation, queued/cache/outbox effects, retention effects, revocation effects, and hidden-data categories. It must not query live candidates, estimate match likelihood, reveal candidate existence, show candidate-specific counts/gates, expose rare-combination internals, or disclose anti-probing thresholds. A broadening or release becomes active only if the participant confirms the exact current preview id/version under a fresh policy decision; stale, client-generated, wrong-schema, wrong-purpose, wrong-output-bundle, wrong-UI-copy-bundle, or expired previews fail closed.
- Internal opportunity dependencies must be physically or cryptographically separated from participant-facing brief surfaces. Candidate profile ids, run-scoped candidate handles, candidate-key hashes, candidate opt-in/exposure/budget/cohort/privacy-stage snapshots, exact candidate-gate codes, exact stale causes, and dependency hashes are service-side dependency data, not participant-facing row data. They must live in a service-role-only internal table, protected store, or column-grant regime with tests equivalent to a physical split. Sanitized opportunity projections, receipts, exports, telemetry, UI screen states, partner projections, and debug endpoints must not select, spread, cache, log, serialize, or hydrate those fields.

- Synthetic previews and dry runs are isolated from the live registry. Onboarding examples, demos, comprehension-review tasks, dry-run screens, and synthetic opportunity cards must use synthetic or formally redacted fixtures only. They must be clearly labelled as examples, must not query live candidate pools, sample real cohort distributions, create policy side effects, reserve budgets, create receipts that look like real matching receipts, or expose no-result/timing signals about real counterparties.
- Participant-facing UI is a safety boundary, not decoration. Background Delegate screens must be task-based, default-off, server-state-derived, and plain-language by default. The client must render opportunity cards, intro prompts, consent dialogs, exposure controls, receipts, correction/export flows, unavailable states, and privacy-freeze controls from sanitized allowlisted screen-state DTOs or repository-equivalent projections, never from internal rows, local feature-flag inference, route presence, or copied policy logic. Disabled, stale, blocked, future-phase, privacy-gated, and unavailable controls must be shown or withheld only through generic, non-enumerating labels. Default copy should use governed action-oriented user terms rather than implementation jargon, with technical details available behind an explicit secondary control. UI copy for high-impact actions must include concrete privacy-impact summaries, expiry/reconfirmation state, revocation effects, and visible pause/freeze/revoke paths, while avoiding urgency, scarcity, popularity, shame, engagement-optimized nudges, bundled broad consent, and euphemisms that hide risk.
- UI simplification must be feature-preserving and non-euphemistic. Product copy may group complex controls into simpler task labels, but it must not remove, hide, weaken, or contradict required consent, exposure, signal-taxonomy, claim-assurance, retention, disclosure, freeze, export, correction, notification, or safety disclosures. If a simplified label could be misunderstood, the screen must show the required privacy-impact summary, an effective-permission preview where applicable, and a technical-detail explanation generated from the active UI-copy bundle. If simplicity conflicts with safety disclosure, safety disclosure wins.
- Effective-permission previews are mandatory for participant scope broadening. Enabling or widening outbound delegate authorization, inbound candidate exposure, high-sensitivity tag confirmation, source-summary tag application, candidate budget, partner/public/federation exposure, intro request, field-level disclosure grant, exact-data export, vault reveal, or privacy-freeze release must reference a current server-derived before/after preview that shows only generic effective permission deltas and hidden-data categories. A preview is not itself an allow decision; it expires quickly, is invalidated by dependency or manifest changes, and must be tied to a later explicit confirmation and fresh action-specific policy decision. Narrowing, pausing, revoking, freezing, or deleting may proceed without a preview but still produces a redacted receipt and dependent stale/cache invalidation where required.
- Participant notification and attention controls are safety controls. Participants may narrow, batch, or suppress non-critical Background Delegate notifications through digest frequency, quiet hours, channel preferences, and maximum non-critical notification volume, but those preferences must not force immediate delivery, distinguish candidate-specific gates, override fixed digest/jitter rules, bypass counterparty notification budgets, or suppress legally/security-required account, privacy-freeze, revocation, retention, or safety notices. Notification preference changes must use sanitized server-state projections and must not expose candidate-specific timing, withheld counts, or hidden policy outcomes.
- Accessibility, localization, readability, and low-bandwidth behavior are promotion gates for enabled user-facing screens. Enabled Background Delegate onboarding, consent, opportunity, intro, disclosure, receipt, export, correction, notification-preference, and privacy-freeze flows must meet repository-standard WCAG 2.2 AA-or-better checks, screen-reader and keyboard coverage, visible focus states, non-color-only status labels, reduced-motion support, mobile/touch layout, plain-language consent copy, locale-aware dates/times, safe timeout recovery, and low-bandwidth fallback. Disabled stubs may waive only checks that would expose no user-facing state or side-effecting control.
- No autonomous outreach.
- No raw private-feed ingestion for matching.
- No raw source text in analytics, logs, notifications, public reports, screenshots, development fixtures, staging clones, replay queues, model-evaluation corpora, demo datasets, backups restored into active systems, or search-index/warehouse snapshots outside approved retention-aware disaster-recovery controls.
- Production background-networking data must not be copied into development, CI, staging, demos, load tests, LLM/model evals, screenshots, notebooks, or vendor debugging environments except under a scoped incident/legal process with minimum-necessary field allowance, redaction, owner approval, expiry, and audit logging. Synthetic or formally redacted fixtures are the default for tests, evals, replay, demos, and red-team exercises. Backup, snapshot, restore, warehouse, and search-index recovery paths must carry deletion/redaction manifests and must not reactivate expired, revoked, anonymized, or redacted candidate/counterparty references after restore.
- No hidden ML ranking of people.
- No latent private profile vectors or embedding-based matching. Eligibility, scoring, anti-probing, notifications, opportunity briefs, and intro requests may use only schema-bound, participant-visible, explicitly confirmed broad fields and tags.
- Match-input lineage is mandatory. Every broad profile field, confirmed tag, source-summary-derived tag, collective signal, partner-grant signal, or disclosure-grant-derived broad field that can influence eligibility, scoring, surfacing, notifications, opportunity briefs, feedback advancement, or intro requests must have an active server-side lineage record tying it to the participant-visible confirmation event, source/profile version, allowed-field policy, signal taxonomy version, purpose-code/version binding, retention window, and revocation state. Orphaned, stale, missing, client-supplied, copied-without-lineage, or retention-expired signals are hard blockers and must mark dependent active artifacts stale. Lineage records must not store raw source text, exact wishes, contact details, or candidate identifiers beyond active service-side references.
- Matching must not reward oversharing or raw profile completeness. Additional private detail, source-summary volume, free text, confirmed tag count, retained history, or source variety must not increase eligibility or score once the minimum explicitly confirmed broad signals for the selected purpose are sufficient. Scoring may use `confirmedSignalSufficiency01` only as a capped sufficiency check for the current purpose, never as a completeness, engagement, richness, or disclosure-volume reward.
- Private block, mute, and do-not-match preferences are hard gates. Participants must be able to create scoped pairwise or organisation/cohort-level safety preferences where product scope supports it, especially after a report, decline, failed intro, or post-mutual-consent interaction. These preferences may suppress matching, surfacing, notifications, feedback advancement, intro requests, reminders, and disclosure grants, but they must remain internal-only and requester-safe. A counterparty, requester, partner, or operator-facing ordinary view must not reveal that a block exists, who set it, exact block scope, or block reason. Block preferences are not matching features, popularity signals, or reputation scores; they are safety and consent constraints.
- Feedback and behavioral events are not implicit match inputs. Opportunity views, dwell time, clicks, dismissals, deferrals, reports, intro requests, notification interactions, receipt opens, and similar action traces must not influence eligibility, scoring, surfacing, notifications, opportunity briefs, feedback advancement, intro requests, candidate exposure, candidate reputation, or future ranking unless the participant explicitly confirms a schema-bound broad profile field or tag through the ordinary confirmation flow. Reports may feed safety review or runtime tripwires only through the existing redacted, rate-limited, corroboration-aware safety channels.
- Source-summary derived tags are proposal-only until explicitly confirmed. There must be no separate ambiguous `derived_broad_tags` matching input; if an existing schema already has `derived_broad_tags`, treat it as a legacy alias for `unconfirmed_derived_tags`, migrate it where feasible, and never use it for eligibility, scoring, surfacing, notifications, opportunity briefs, or intro requests.
- Source-summary approval and broad-tag confirmation are separate consent gates. Setting a source summary to `approved` must not by itself make any proposed tag, proposed field, summary-derived category, or allowed-field key usable for matching. A source-summary-derived tag may influence eligibility, scoring, surfacing, notifications, opportunity briefs, feedback advancement, or intro requests only if it is in `confirmed_broad_tags` and has an explicit participant confirmation record for the current source-summary version and allowed-field policy. Bulk confirmation must display every tag being confirmed; revoking a tag confirmation removes future matching influence and marks dependent active briefs stale.
- Third-party data in source summaries, exports, public URLs, manual notes, email/calendar excerpts, or chatbot history must not become a hidden profile of someone who is not the participant. Private third-party identifiers, contact details, wishes, constraints, capabilities, vulnerabilities, affiliations, or strategy must be redacted or ignored for matching unless that person independently participates and confirms the relevant profile/exposure fields through their own account. A participant may confirm broad tags only about their own wishes/offers/capabilities or non-sensitive public context; third-party-derived tags are hard blockers for eligibility, scoring, surfacing, notifications, opportunity briefs, feedback advancement, and intro requests.
- Entity resolution is conservative and consent-bound. Imported contact names, email/calendar correspondents, public URL mentions, partner records, organization aliases, account similarities, or model-inferred duplicate profiles must not become candidate identities, dedupe keys, cohort membership, or disclosure targets unless the relevant person/organization/collective has self-claimed the profile, independently verified the link, or an operator confirms the link under a narrow policy decision. Ambiguous, disputed, imported-only, stale, or partner-only identity links are hard blockers for scoring, surfacing, intro creation, and disclosure. Requester/counterparty outputs must not reveal entity-resolution status, duplicate-profile links, alias evidence, or identity confidence.
- No global moral ranking.
- No inferred ideology, psychology, protected traits, hidden preferences, or exact private wishes.
- Human review before disclosure, contact, reliance, counterparty-facing notification, intro-review approval, or any non-redacted/counterparty-affecting state change. Internal deterministic creation of redacted opportunity briefs, redacted receipts, stale-state transitions, atomic budget reservations/counters, retention-cleanup actions, or other participant-owned internal artifacts may be automated only when all non-waivable hard gates pass; these internal artifacts must not disclose exact details, contact counterparties, create reliance obligations, or make external/counterparty-facing state changes before the required review and consent stage.
- Human/operator review is not a waiver mechanism. Operators, admins, reviewers, feature flags, and break-glass paths must not override requester authorization, candidate exposure consent, purpose-policy compatibility, risk-review coverage, anti-probing floors, stale-state checks, retention/anonymization state, explicit-signal-only matching, RLS, encryption, or notification restrictions. Manual actions may only narrow scope, add blockers, suppress/quarantine artifacts, mark artifacts stale, reject a request, or approve a next step after all hard gates pass.
- High-impact governance and safety changes require separation of duties. The actor who proposes, authors, benefits from, or materially changes a high-impact action must not be the sole approver. Purpose-registry semantic broadening, purpose-code disabling/re-enabling, external-pilot or public-broad-preview risk-review approval, partner-matchmaker grant activation, emergency-stop release, aggregate-release approval, vault-reveal policy changes, production-sensitive-data exceptions, and broad retention/legal-hold changes must use the repository-defined dual-control path and immutable redacted audit records.
- High-impact actions require tamper-evident redacted audit-chain events. Manifest activation/rollback, governed-bundle activation, emergency-control release, risk/pilot/safety-case approval, partner/federation/external-processor activation, production-sensitive-data exception, retention/legal hold, operator field reveal, vault decrypt/reveal, exact disclosure grant, mediated-contact policy escalation, and break-glass safety action must emit a redacted event into a tamper-evident append-only audit chain or repository-equivalent WORM/audit-log system. Audit events must chain to the prior event or use an equivalent integrity proof, snapshot governed bundle hashes and policy-decision ids, and be verifiable without exposing raw source text, exact wishes, candidate identities, exact contact details, message content, private cohort membership, legal strategy, or hidden abuse heuristics. Missing or unverifiable required audit-chain events fail closed for high-impact action completion.
- Background delegate execution is capability-sandboxed. Delegate runs, workers, scheduled jobs, LLM proposal helpers, federation bridges, and partner-service delegates may call only allowlisted tools for the exact action kind. They must not use arbitrary outbound network, browsing, scraping, code execution over imported content, contact/email/calendar writes, payment actions, or partner APIs unless the tool capability is registered, risk-reviewed, feature-flagged, policy-decision gated, and covered by tests.
- High-impact participant actions require recent step-up authentication or repository-equivalent reauthentication. Broad delegate authorization, public-broad-preview exposure, partner-matchmaker exposure, candidate budget widening, high-sensitivity/vulnerability signal confirmation, vault decrypt/reveal, field-level disclosure grants, collective authority activation, and account recovery after suspicious activity must fail closed without a current step-up event. Account-compromise signals must pause high-impact background-networking actions, queued sends, and disclosure grants until review or participant re-confirmation.
- Participant correction and appeal paths are non-disclosing. Participants may request correction of their own profile fields, source-summary tags, exposure settings, safety preferences, entity-resolution claims, consent records, disclosure grants, and redacted denial categories. Correction workflows must not reveal candidate existence, exact blocker reasons, hidden abuse heuristics, private cohort membership, or counterparty identifiers, and accepted corrections must mark dependent artifacts, policy decisions, caches, receipts, intro requests, and exports stale.
- Operator review is least-privilege and redacted by default. Operator dashboards, queues, exports, and search tools must not show raw source text, exact wishes, contact details, active candidate identifiers, exact targeting reasons, or full internal rows unless a field-scoped reveal is required for the specific review action. Reveals require role authorization, reason code, target artifact, field keys, expiry, redacted receipt/audit entry, and no bulk browsing, bulk export, unrestricted search, or analytics reuse.
- Sparse or overly specific searches are withheld or broadened.
- Delegate runs require an active, unexpired, participant-controlled authorization.
- Delegate runs are cohort-, pilot-, or matchmaker-scoped by default; global cross-registry scans require a separate explicit flag and operator approval.
- Delegate authorizations are purpose-bound. Every delegate run, opportunity brief, and intro request must cite an allowlisted purpose code such as `moral_trade_offer`, `donation_offset`, `pledge_swap`, `moral_public_good`, `research_collaboration`, or `community_intro`. Broad catch-all purposes such as `anything useful`, `general networking`, or unbounded opportunity discovery are not valid launch scopes.
- Delegate runs are single-purpose. Even if an authorization contains multiple allowed purpose codes, each run must choose exactly one purpose code; opportunity briefs, feedback advancement, receipts, and intro requests must inherit that exact code. The system must not merge, fallback across, or silently substitute purpose codes to increase match volume.
- Purpose-code meanings are versioned and immutable. Purpose codes must come from a maintained allowlist / registry with a `purpose_policy_version`; do not allow user-defined purpose codes, broad catch-all codes, or semantic broadening of an existing code. If a purpose category is materially changed, split, merged, deprecated, or broadened, existing delegate authorizations and candidate exposure settings must not be silently reinterpreted; they require explicit re-confirmation or become stale for that purpose.
- Multi-purpose consent must use per-purpose policy-version bindings. Any delegate authorization or candidate exposure setting that contains more than one purpose code must store explicit `{purpose_code, purpose_policy_version}` pairs for each code. A single `purpose_policy_version` field must not be treated as covering multiple purpose codes unless the purpose-code registry explicitly defines a single global policy version for those exact codes, and this spec assumes per-purpose bindings by default.
- The purpose-code registry is a governed artifact, not scattered UI copy. Each active purpose code must have one canonical registry record containing its version, label, allowed surfaces, prohibited uses, risk tier, and re-confirmation rule. Delegate authorization, candidate exposure, delegate-run, opportunity-brief, receipt, intro-request, documentation, and tests must all validate against this registry record; if the registry entry is deprecated, superseded, materially changed, or missing, affected runs and briefs must fail closed or become stale.
- Non-staff or external-pilot delegate runs require a current approved adversarial risk review for the exact purpose code, purpose-policy version, allowed surfaces, audience/cohort scope, notification path, retention policy, LLM data-handling mode, abuse-case analysis, rollback plan, and kill-switch owner. Internal/staff-only testing may run behind feature flags, but any use involving ordinary users, partner cohorts, public-broad-preview scope, or candidate-facing exposure must fail closed without this review.
- Non-staff, partner, federation, high-sensitivity, high-impact-claim, and public-broad-preview lanes require a current pilot-evaluation and adversarial safety-case record with exact scope, shadow/canary requirements, pre-registered success/harm thresholds, independent review where configured, and sunset/rollback rules. Missing, expired, failed, wrong-scope, inconclusive, or unresolved-critical-finding evaluation records fail closed for promotion, ordinary-user notification, candidate-facing exposure, and public-broad-preview use.
- Scoped emergency stop controls are non-waivable. If an active emergency stop applies to the global system, purpose code, purpose-policy version, allowed surface, audience scope, cohort, notification path, LLM mode, or retention class, the system must cancel or pause pending runs, suppress notifications, block new candidate surfacing, block opportunity-brief creation, block feedback advancement, block intro-request creation, and mark dependent active artifacts stale or emergency-paused. Feature flags, operator/admin actions, fixtures, and break-glass paths must not bypass an active emergency stop; they may only activate, narrow, or release it through the documented safety-action process.
- Runtime safety tripwires are non-waivable for known invariant failures. Blocking tripwires must automatically fail closed and activate the narrowest applicable emergency control, or pause the affected purpose/surface/cohort lane, when they detect unsafe notification attempts, candidate-facing exposure before the intro-consent flow, latent-vector or embedding-based matching attempts, missing/expired risk-review use, RLS/encryption failures, retention/anonymization failures, repeated anti-probing threshold breaches, or a severe report/operator-overrule spike. Review-only anomaly tripwires may queue operator review, but they must not permit new surfacing if their configured severity is blocking. Tripwire inputs, logs, and summaries must use only redacted aggregate signals and must not expose exact wishes, source notes, candidate identities, prompts, message text, private cohort membership, or hidden abuse heuristics.
- Tripwire-triggered containment must be resistant to adversarial denial-of-service and capture. Signal sources must be classified at least as `trusted_invariant`, `platform_integrity`, `operator_confirmed`, `user_controllable_aggregate`, or `mixed`. Direct invariant failures and platform-integrity failures may automatically activate scoped emergency controls. User-controllable aggregate signals such as reports, dismissals, suspicious feedback, or mass low-quality reports must not by themselves trigger global stops, public-broad-preview stops, whole-purpose stops, whole-cohort stops, candidate exposure revocation, or broad deplatforming. Without corroboration from trusted system signals or operator-confirmed evidence, user-controllable aggregate signals may only queue review, apply rate-limited narrow cool-offs, suppress the specific suspect artifact, or pause the smallest affected lane. Any broader stop based partly on user-controllable signals must record the corroborating trusted signal or operator-confirmed basis, and must use the narrowest scope justified.
- Candidate-side exposure consent is mandatory and time-bounded. A candidate profile may be scored or surfaced only if the candidate's current profile is active, not paused or deleted, and its separately confirmed, unexpired inbound-delegate settings authorize the requesting delegate's purpose code, audience scope, cohort, and allowed surfaces. General `discoverability_scope` is necessary but not sufficient; it must not by itself imply inbound delegate discovery. `owner_only`, `inbound_delegate_discovery = off`, purpose-mismatched, out-of-cohort, paused, deleted, revoked, expired, stale-confirmation, migrated-without-reconfirmation, or otherwise unconfirmed candidate exposure states are hard blockers.
- Candidate-side exposure is also budgeted. Non-`off` inbound delegate discovery must have explicit or repository-safe default per-purpose/per-scope surfacing budgets, pending-intro limits, and cool-off behavior. These budgets apply across requesters, delegate runs, and cohorts within the configured scope. Exhausted budgets, missing required budgets, or active candidate cool-offs are hard blockers before scoring, surfacing, opportunity-brief creation, feedback advancement, candidate-facing exposure, or intro-request creation. Candidates may narrow or pause budgets immediately; widening budgets requires explicit confirmation and updates the candidate exposure/budget version. Operators may suppress or narrow budget state but must not override an exhausted candidate budget to create exposure.
- Candidate-side budget enforcement must be atomic, idempotent, and retention-bound. The system must reserve or increment candidate exposure counters in the same transactional boundary as surfacing or intro advancement, or use short-lived reservations that expire and release automatically. Concurrent delegate runs, retries, queue workers, or duplicate requests must not allow a candidate to exceed the confirmed budget. Counter rows must use active-only candidate identifiers and be deleted, anonymized, or aggregated after their window and any valid safety/legal hold.
- Requester-visible outputs must not reveal candidate-specific gate outcomes. Internal blocker reasons such as candidate opt-out, candidate exposure mismatch, budget exhaustion, cool-off, prior dismissal/report, cohort mismatch, privacy-stage conflict, retention/anonymization state, or third-party-data block must be mapped to generic requester-facing categories such as `privacy_or_consent_gate`, `availability_or_budget_gate`, `safe_pool_withheld`, `stale_or_unavailable`, or `review_required`. Opportunity briefs, notifications, receipts, API responses, manual-scan diagnostics, telemetry, and public docs shown to a requester must not let the requester infer whether a particular candidate exists, opted out, hit a budget, is in a cohort, or was withheld for a specific private reason. Candidates may see only their own coarse budget/exposure status and must not see requester identities, exact sparse counts, or probing signals before the relevant consent stage.
- Requester-visible blocker, factor, and diagnostic aggregates must also be probe-resistant. Counts tied to candidate-specific gates, including genericized categories, must be bucketed, suppressed, or aggregated over a sufficiently broad safe pool before display. Do not expose exact per-category counts, deltas, sequence changes, candidate budget-state labels, or receipt/telemetry aggregates that let a requester infer how many candidates were withheld for opt-out, budget, cool-off, cohort, privacy-stage, retention, prior-dismissal/report, third-party-data, or similar private reasons. Candidate budget-state labels such as `clear`, `near_limit`, `exhausted`, or `cooloff` are candidate-owned or internal service/safety data only; requester-visible, exportable, or public surfaces may use only generic availability/budget categories that are bucketed, withheld, or aggregated over a sufficiently broad safe pool. Internal exact counts and budget-state labels may be retained only in service-side safety/quota tables under RLS, retention limits, and redacted audit policy.
- Requester-facing and counterparty-facing payloads must pass a quasi-identifier / rare-combination redaction check. Broad cause areas, offers/asks, capability tags, coarse locations, availability windows, cohort labels, purpose labels, factor-code combinations, provenance labels, timestamps, and dependency labels must be considered in combination, not only field-by-field. If the combination is unique or too sparse inside the applicable safe pool, the system must coarsen, withhold, delay, or suppress the payload before display, notification, receipt rendering, export, telemetry, partner report, or counterparty prompt.
- No-result and timing side channels are requester-visible outputs. No-match, low-confidence, withheld, blocked, stale, or “nothing new” states must not reveal whether a candidate exists or which candidate-specific gate applied. Do not expose immediate no-result reasons, exact run completion timing, queue-state transitions, notification absence, digest-count deltas, receipt sequence changes, retry timing, or manual-scan diagnostics that let a requester distinguish candidate absence from candidate opt-out, exposure mismatch, budget exhaustion, cool-off, cohort mismatch, privacy-stage conflict, retention/anonymization state, prior dismissal/report, third-party-data blocks, or similar private gates. Use fixed digest windows, jittered delivery, rate limits, safe-pool thresholds, and generic “no privacy-safe opportunity surfaced” language for requester-visible surfaces. Internal exact timing and reason data may exist only in service-side safety tables under RLS, retention limits, and redacted audit policy.
- Candidate-dependency snapshots are internal-only service fields. Snapshot fields for candidate opt-in status, discoverability, exposure version, inbound delegate settings, budget version, cohort membership, dependency invalidation, and candidate-specific stale causes may be stored only for server-side revalidation, safety review, and retention cleanup. They must not be returned through requester-facing APIs, receipts, exports, diagnostics, notifications, stale-brief explanations, telemetry, or public docs. Requester-visible dependency and stale labels must use generic categories such as `valid`, `stale_or_unavailable`, `recompute_required`, `privacy_or_consent_gate`, or `review_required`; candidate-owned views may show only the candidate's own coarse exposure/budget state and must not reveal requester identities or probing signals.
- Requester-facing opportunity data must be served through sanitized projections, not by direct reads from internal opportunity-brief rows. Participant ownership/RLS over an internal row is not sufficient when that row contains active candidate identifiers, stable candidate hashes, candidate-dependency snapshots, exact blocker states, exact timing, budget states, or retention/anonymization fields. Internal tables or columns containing those values must be service-role/operator-only, protected by database column-level grants, or split into separate internal tables. Ordinary authenticated UI/API paths must query a sanitized view or server-side DTO that physically excludes internal-only fields and exposes only requester-safe labels, buckets, redactions, and allowed actions. No route, client component, export, receipt renderer, telemetry event, or debug endpoint may use `select *` or equivalent against internal background-networking artifact tables.
- Internal opportunity dependencies must be isolated from participant-facing brief storage. Candidate profile ids, run-scoped candidate handles, candidate-key hashes, candidate opt-in/exposure/budget/cohort/privacy-stage snapshots, exact candidate-gate codes, exact stale causes, and dependency hashes are service-side dependency data, not participant-facing row data. They must live in a service-role-only internal table, protected store, or column-grant regime with tests equivalent to a physical split. Sanitized opportunity projections, receipts, exports, telemetry, UI screen states, partner projections, and debug endpoints must not select, spread, cache, log, serialize, or hydrate those fields.
- Client-side storage, outbox rows, CDN/server caches, export files, notification queues, UI hydration payloads, and offline snapshots are consent-versioned and revocation-aware. They must be short-lived, contain only sanitized payloads, and be revalidated against current authorization, candidate exposure, block/mute state, disclosure grants, emergency controls, retention state, and output-schema version at render/send/download time. Revocation, expiry, stale-state changes, emergency stops, disclosure-grant changes, candidate exposure changes, source-summary revocation, or block/mute updates must suppress queued sends and purge or invalidate cached requester/counterparty-visible payloads.
- Requester-facing serialization must be default-deny and allowlist-based. Every requester-visible opportunity brief, stale-state response, delegate receipt, diagnostic, export, cache record, telemetry payload, and UI hydration payload must be produced by a versioned explicit output schema that enumerates allowed keys and rejects or strips unknown keys before logging, caching, telemetry, rendering, or network response. Do not infer requester-facing response types from internal database tables, ORM entities, GraphQL selection sets, TypeScript spread types, JSON schema generated from internal rows, or unreviewed contract generators. Adding any new requester-visible key requires an explicit schema-version update, privacy review, and tests showing it cannot reveal candidate identity, candidate-specific gates, timing side channels, or internal dependency snapshots.
- Intro-request targets are server-derived and requester-facing intro state is sanitized. A requester-facing route must not accept `counterparty_profile_id`, candidate profile identifiers, candidate hashes, private cohort identifiers, exact candidate-gate reasons, or free-form target descriptors from the client when creating or advancing a background-networking intro request. The server must derive the counterparty only from the valid active opportunity brief under service-role hard gates, store active counterparty identifiers only in internal tables, and expose requester-facing intro status through a separate versioned allowlist projection/schema with generic states such as `operator_review`, `counterparty_pending`, `mutual_consent`, `declined_or_unavailable`, or `closed`. Decline, expiry, counterparty opt-out, budget/cool-off, cohort, retention, or privacy-stage causes must not be distinguishable to the requester by labels, response keys, timing, polling cadence, receipts, telemetry, exports, or notification absence.
- Intro-request creation is idempotent and single-active per requester-owned opportunity brief and inherited purpose-code/version pair. Repeated `interested` feedback, explicit intro-request calls, client retries, queue retries, duplicate submissions, or replayed requests must not create multiple intro requests, multiple redacted receipts for the same transition, duplicate candidate budget reservations/counter increments, duplicate operator-review tasks, duplicate counterparty-facing notifications, or distinguishable timing/status differences. The system may return the existing sanitized intro-request projection, a generic already-pending status, or a generic conflict, but it must not reveal whether the duplicate was blocked by candidate opt-out, budget/cool-off, cohort, retention, privacy-stage, operator action, or another candidate-specific gate.
- Counterparty-facing intro-consent requests are also sanitized and minimum-necessary. Before mutual consent, a counterparty-facing route, notification, email, receipt, export, or UI payload may show only broad purpose, broad requested disclosure categories, generic requester-safe rationale, generic operator-review status, coarse expiry/review-window bucket, and available choices such as `review`, `decline`, or `ask_for_more_context`. It must not reveal the requester's exact identity, contact details, exact wishes, source notes, private cohort membership, exact requester strategy, exact targeting reason, or any internal requester/candidate identifiers unless a later field-level privacy grant explicitly authorizes that disclosure. Counterparty accept, decline, timeout, ignore, report, or request-more-context paths must not leak exact counterparty-specific reasons back to the requester. A request for more context is a new disclosure request: it must be converted into allowlisted broad categories, shown to the requester for explicit approval, reviewed where policy requires, and returned only through sanitized projections with side-channel-safe timing.
- Counterparty-facing intro-consent notifications and reminders are budgeted and not requester-triggered. A requester must not be able to nudge a counterparty, choose reminder timing, observe reminder delivery/open/click state, infer ignore vs timeout vs decline, or distinguish reminder suppression caused by counterparty opt-out, cool-off, budget, report, retention, emergency stop, or operator action. Reminders, if any, must be system-controlled, capped, generic, jittered or digest-based where needed, and counted against counterparty notification/attention budgets.
- Partner-matchmaker scopes are named, grant-bound, and least-privilege. `partner_matchmaker` must not mean “any approved partner” or “a partner can search the registry.” Every partner-matchmaker run must reference a current active grant for a specific partner/workflow, purpose-code/version, audience/cohort scope, surface set, quotas, operator identities, expiry, and sanitized output surfaces. Partner staff and partner systems must not receive raw registry access, internal opportunity-brief rows, candidate identifiers, candidate-dependency snapshots, exact blocker states, exact timing, candidate budget states, or arbitrary query results.
- Collective or organisational profiles require authority and member-data minimization. If the system lets a participant represent a collective, the representative must have current authority for the exact purpose, surfaces, and cohort/audience scope. Collective documents, member rosters, internal discussions, or strategy notes must not create matchable wishes, vulnerabilities, affiliations, capabilities, contact details, constraints, or strategy for individual members unless those members independently confirm the relevant fields and exposure settings through their own accounts.
- Cross-account and partner-seat anti-probing must detect materially equivalent probes without becoming broad private fingerprinting. Abuse signals used for this purpose must be redacted, retention-bound, unavailable to requesters, excluded from matching/engagement ranking, and used only for narrow throttling, review, or containment.
- Payment tier, partner commercial priority, sponsorship, or engagement likelihood must not influence person eligibility, scoring, surfacing order, notification priority, candidate exposure, candidate budget handling, intro advancement, or disclosure. Monetization may only control access to explicitly reviewed lanes, quotas, or support workflows after all non-waivable gates pass.
- Opportunity briefs must snapshot their authorization, profile, source-summary, candidate-exposure, candidate-discoverability, cohort, and expiry dependencies. Stale briefs cannot be displayed as active, used for notifications, or advanced into intro requests.
- Helper runs must be probe-resistant: enforce a minimum eligible-pool floor, suppress repeated candidate exposure, bucket visible counts, and block profile/query variants that function as enumeration attempts.
- Unconfirmed uncertainty flags from source summaries or wish interviews may appear as missing-context explanations, but must not add positive score until explicitly confirmed by the participant.
- LLM or ML synthesis may propose explicit fields for user review, but it must not create hidden matching features, private embeddings, latent desire profiles, or unreviewed model-derived vectors that influence eligibility, scoring, surfacing, notifications, or intro requests.
- Participant-visible or participant-owned receipt timelines must cover every material Background Delegate consent, privacy, notification, correction/export, disclosure, freeze, retention, delegate-run, opportunity, feedback, intro, stale-transition, and revocation event. Receipts must be governed by active output-schema and UI-copy bundles, may use delayed or internal-only redacted visibility for operator/legal/safety events, and must not expose raw source text, exact wishes, exact candidate identity, private cohort membership, message content, hidden gate outcomes, rare-combination internals, or abuse heuristics.
- Every background-networking artifact must have an explicit retention policy from the current content-addressed retention-policy bundle. Actionable artifacts retain linkable candidate references only while needed for participant review, operator review, safety holds, or active consent flows under that bundle; after that window, they must be deleted or anonymized. Redacted/anonymized audit rows may remain only when needed for abuse prevention, safety review, or legally required records.
- Retention holds are non-actionability-preserving and time-bounded. A safety, abuse-prevention, incident-response, dispute, or legal hold may delay deletion/anonymization only when it is a separate governed artifact with a reason code, owner, scope, allowed retained fields, expiry/review date, and redacted summary. A hold must not widen authorization, create consent, permit matching, permit notifications, permit feedback advancement, permit intro-request creation, reverse anonymization, repopulate cleared candidate/counterparty identifiers, or make stale/closed/expired artifacts actionable. Non-legal holds must have a finite repository-defined maximum duration and require renewal with a fresh redacted justification; legal holds must retain only fields needed for the stated legal obligation. Release or expiry must resume the normal retention cleanup job.
- Linkable candidate/counterparty identifiers and stable candidate hashes are active-only. Once a brief, feedback item, intro request, or receipt is redacted or anonymized, direct candidate/counterparty UUIDs and stable cross-artifact candidate hashes must be set to `null` or replaced only with non-linkable aggregate/redacted values. No schema constraint may require persistent direct identifiers after anonymization.
- Do not facilitate illegal, coercive, collusive, price-fixing, fraud, intimidation, harassment, doxxing, extortion, sanctions evasion, or other harmful coordination. Safety blockers come from the current content-addressed safety-blocker taxonomy and override scores, engagement signals, payment, partner status, operator preference, and requester/counterparty demand.
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

Production defaults must be `false` unless the repository already has a staged rollout convention that says otherwise. Tests may enable the flags explicitly. Delegate authorization enforcement, RLS, redaction, revocation, safety-blocker taxonomy enforcement, and queue-freshness controls are not optional and must not be disabled by feature flag. Global delegate runs must remain off unless the repository already has a documented operator-approved rollout gate for them.

---

# Data model

Prefer existing entities if present. Otherwise add or extend the following tables with RLS and participant-scoped access policies.

## `background_release_manifests`

Use an existing deployment provenance / release-attestation system if present; otherwise add a compact governed manifest table or signed typed-config bundle. This is the release-time source of truth tying policy-critical code and governed artifacts together.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable manifest id |
| `environment` | enum: `development \| staging \| internal_staff \| production` |
| `status` | enum: `draft \| approved \| active \| superseded \| revoked \| rollback_only` |
| `background_networking_phase` | enum: `phase_0_policy_skeleton \| phase_1_internal_staff_core \| phase_2_source_summary_intro_skeleton \| phase_3_tiny_cohort_partner_pilot \| phase_4_higher_power_lanes \| full_mature_system`; active phase for this release |
| `phase_gate_bundle_version` | `text not null`; governed route/worker/UI/export/telemetry lane gating bundle for the active phase |
| `phase_gate_bundle_hash` | `text not null`; canonical content hash over the complete sorted active phase-gate lane matrix |
| `code_version` | `text not null`; commit SHA or repository-standard build id |
| `migration_bundle_version` | `text not null` |
| `policy_engine_version` | `text not null` |
| `governed_bundle_canonicalization_profile_version` | `text not null` |
| `governed_bundle_canonicalization_profile_hash` | `text not null`; canonical content hash over the active bundle-canonicalization/materialization profile |
| `policy_composition_bundle_version` | `text not null` |
| `policy_composition_bundle_hash` | `text not null`; canonical content hash over the complete sorted active policy-composition bundle |
| `artifact_transition_policy_bundle_version` | `text not null` |
| `artifact_transition_policy_bundle_hash` | `text not null`; canonical content hash over the complete sorted active artifact-transition policy bundle |
| `artifact_dependency_policy_version` | `text not null` |
| `artifact_dependency_policy_hash` | `text not null`; canonical content hash over the active artifact-dependency/stale-propagation policy |
| `policy_action_kind_registry_version` | `text not null` |
| `policy_action_kind_registry_hash` | `text not null`; canonical content hash over the complete sorted active policy-action-kind registry |
| `purpose_registry_version` | `text not null` |
| `purpose_registry_hash` | `text not null`; canonical content hash over the complete sorted active purpose-code registry |
| `signal_taxonomy_version` | `text not null` |
| `signal_taxonomy_hash` | `text not null`; canonical content hash over the complete sorted active signal-taxonomy registry |
| `safety_blocker_taxonomy_version` | `text not null` |
| `safety_blocker_taxonomy_hash` | `text not null`; canonical content hash over the complete sorted active safety-blocker taxonomy |
| `claim_assurance_taxonomy_version` | `text nullable` |
| `claim_assurance_taxonomy_hash` | `text nullable`; canonical content hash over the complete sorted active claim-assurance taxonomy |
| `output_schema_bundle_version` | `text not null` |
| `output_schema_bundle_hash` | `text not null`; canonical content hash over the complete sorted active output-schema registry |
| `ui_copy_bundle_version` | `text not null` |
| `ui_copy_bundle_hash` | `text not null`; canonical content hash over the complete sorted active UI-copy / consent-copy bundle |
| `client_surface_integrity_policy_version` | `text not null` |
| `client_surface_integrity_policy_hash` | `text not null`; canonical content hash over the complete sorted active Background Delegate client-surface integrity policy bundle |
| `tool_capability_bundle_version` | `text not null` |
| `tool_capability_bundle_hash` | `text not null`; canonical content hash over the complete sorted active tool-capability registry |
| `feature_flag_defaults_hash` | `text not null` |
| `retention_policy_bundle_version` | `text not null` |
| `retention_policy_bundle_hash` | `text not null`; canonical content hash over the complete sorted active retention-policy bundle |
| `aggregate_release_policy_version` | `text nullable` |
| `aggregate_release_policy_hash` | `text nullable`; canonical content hash over the complete sorted active aggregate-release policy bundle |
| `queue_freshness_control_version` | `text not null` |
| `queue_freshness_control_hash` | `text not null`; canonical content hash over the complete sorted active queue-freshness/backpressure control bundle |
| `external_processor_policy_version` | `text nullable` |
| `external_processor_policy_hash` | `text nullable`; canonical content hash over the complete sorted active external-processor/delivery-provider policy bundle |
| `sensitive_audit_chain_policy_version` | `text not null` |
| `sensitive_audit_chain_policy_hash` | `text not null`; canonical content hash over the active sensitive-audit-chain integrity policy |
| `risk_review_refs` | `uuid[] not null default '{}'` |
| `approved_by` | `text[] not null default '{}'` |
| `activated_at` | `timestamptz nullable` |
| `superseded_at` | `timestamptz nullable` |
| `revoked_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |

Release-manifest requirements:

- Every policy decision record must snapshot the active `release_manifest_id`, `governed_bundle_canonicalization_profile_version`, `governed_bundle_canonicalization_profile_hash`, `policy_composition_bundle_version`, `policy_composition_bundle_hash`, `artifact_transition_policy_bundle_version`, `artifact_transition_policy_bundle_hash`, `artifact_dependency_policy_version`, `artifact_dependency_policy_hash`, `policy_action_kind_registry_version`, `policy_action_kind_registry_hash`, `purpose_registry_version`, `purpose_registry_hash`, `signal_taxonomy_version`, `signal_taxonomy_hash`, `safety_blocker_taxonomy_version`, `safety_blocker_taxonomy_hash`, `claim_assurance_taxonomy_version`, `claim_assurance_taxonomy_hash`, `retention_policy_bundle_version`, `retention_policy_bundle_hash`, `aggregate_release_policy_version`, `aggregate_release_policy_hash`, `queue_freshness_control_version`, `queue_freshness_control_hash`, `external_processor_policy_version`, `external_processor_policy_hash`, `sensitive_audit_chain_policy_version`, `sensitive_audit_chain_policy_hash`, `output_schema_bundle_version`, `output_schema_bundle_hash`, `ui_copy_bundle_version`, `ui_copy_bundle_hash`, `client_surface_integrity_policy_version`, `client_surface_integrity_policy_hash`, `tool_capability_bundle_version`, `tool_capability_bundle_hash`, `background_networking_phase`, `phase_gate_bundle_version`, and `phase_gate_bundle_hash`; render/send/export/telemetry/cleanup actions must fail closed if the manifest is stale, revoked, wrong-environment, wrong-scope, wrong-phase, wrong-bundle-hash, wrong-governed-bundle-canonicalization-profile-version, wrong-governed-bundle-canonicalization-profile-hash, wrong-policy-composition-bundle-version, wrong-policy-composition-bundle-hash, wrong-artifact-transition-policy-bundle-version, wrong-artifact-transition-policy-bundle-hash, wrong-artifact-dependency-policy-version, wrong-artifact-dependency-policy-hash, wrong-action-kind-registry-version, wrong-action-kind-registry-hash, wrong-purpose-registry-version, wrong-purpose-registry-hash, wrong-signal-taxonomy-version, wrong-signal-taxonomy-hash, wrong-safety-blocker-taxonomy-version, wrong-safety-blocker-taxonomy-hash, wrong-claim-assurance-taxonomy-version, wrong-claim-assurance-taxonomy-hash, wrong-retention-policy-bundle-version, wrong-retention-policy-bundle-hash, wrong-aggregate-release-policy-version, wrong-aggregate-release-policy-hash, wrong-queue-freshness-control-version, wrong-queue-freshness-control-hash, wrong-external-processor-policy-version, wrong-external-processor-policy-hash, wrong-sensitive-audit-chain-policy-version, wrong-sensitive-audit-chain-policy-hash, wrong-output-schema-bundle-version, wrong-output-schema-bundle-hash, wrong-ui-copy-bundle-version, wrong-ui-copy-bundle-hash, wrong-client-surface-integrity-policy-version, wrong-client-surface-integrity-policy-hash, wrong-tool-capability-bundle-version, wrong-tool-capability-bundle-hash, or inconsistent with the deployed code path.
- The governed bundle-canonicalization/materialization profile is the operational source of truth for how all manifest-bound registry, policy, schema, copy, retention, aggregate-release, phase-gate, action-kind, tool-capability, composition, and transition hashes are materialized and recomputed. The active phase and content-addressed phase-gate bundle are the operational source of truth for which routes, workers, UI panels, feature flags, queue consumers, export paths, telemetry paths, partner callbacks, source-summary paths, intro paths, disclosure paths, vault paths, aggregate-release paths, and federation paths may run; the content-addressed purpose-code registry is the operational source of truth for purpose semantics, allowed surfaces, prohibited uses, risk tiers, and re-confirmation rules; the content-addressed signal-taxonomy registry is the operational source of truth for sensitivity tiers, vulnerability-like classifications, allowed signal purposes/surfaces, confirmation/review requirements, and prohibited signal uses; the content-addressed safety-blocker taxonomy is the operational source of truth for prohibited-coordination classes, blocked action families, severity, review requirements, requester-safe blocker labels, and hard-block behavior; the content-addressed claim-assurance taxonomy is the operational source of truth for high-impact claim classes, minimum assurance levels, evidence requirements, expiry windows, allowed purposes/surfaces, reliance limits, and prohibited reliance uses; the content-addressed retention-policy bundle is the operational source of truth for artifact retention classes, linkable-retention windows, retained-field allowances, anonymization/deletion rules, cache/outbox invalidation rules, backup deletion-manifest requirements, and non-actionability guarantees; the content-addressed aggregate-release policy bundle is the operational source of truth for aggregate query families, scopes, minimum group sizes, differencing windows, suppression/noise policy, review state, expiry, and revocation invalidation; the content-addressed queue-freshness control bundle is the operational source of truth for pending-work maximum age, retry/drain behavior, stale-by-delay transitions, queue-health gates, catch-up suppression, and side-channel-safe backlog handling; the content-addressed policy-composition bundle is the operational source of truth for deny-overrides, conflict behavior, least-permissive intersection rules, and non-waiver exceptions; the content-addressed artifact-transition policy bundle is the operational source of truth for artifact states, allowed transitions, preconditions, side effects, and non-resurrection guarantees; the content-addressed artifact-dependency/stale-propagation policy is the operational source of truth for dependency edge families, invalidation triggers, stale-propagation worklists, and dependency-current checks; the content-addressed policy-action-kind registry is the operational source of truth for which actions those lanes may perform; the content-addressed output-schema bundle is the operational source of truth for which requester-facing, counterparty-facing, partner-facing, export, cache, UI-hydration, telemetry, and aggregate-report fields may be emitted; the content-addressed UI-copy bundle is the operational source of truth for consent dialogs, privacy-impact summaries, notification copy, receipt labels, unavailable-state labels, accessibility labels, localization text, and counterparty/requester prompt copy; the content-addressed client-surface integrity policy bundle is the operational source of truth for CSP, allowed resource origins, URL/referrer policy, service-worker/offline-cache policy, route-token policy, and third-party resource exclusions on Background Delegate screens; the content-addressed external-processor policy bundle is the operational source of truth for named processors, delivery providers, allowed data classes, delivery telemetry, retention, subprocessors, and revocation; the content-addressed sensitive-audit-chain policy is the operational source of truth for high-impact audit-chain event families, chaining/integrity method, redaction, verification, and retention; and the content-addressed tool-capability bundle is the operational source of truth for which delegate, worker, LLM proposal, partner-callback, notification, retention, and vault-access capabilities may run. Documentation and tests must validate against these same governed records rather than manually restating a different phase, purpose-code registry, policy-composition bundle, artifact-transition bundle, artifact-dependency policy, retention-policy bundle, aggregate-release policy bundle, queue-freshness control bundle, external-processor policy, sensitive-audit-chain policy, safety-blocker taxonomy, action-kind allowlist, output-schema allowlist, UI-copy bundle, client-surface integrity policy, governed-bundle canonicalization profile, or tool-capability allowlist.
- Activating, revoking, or rolling back a production or non-staff manifest is a high-impact governance change and must follow the configured dual-control and conflict-recusal process.
- A rollback manifest must not silently resurrect deprecated purpose semantics, disabled tools, retired output schemas, deleted migrations, stale risk reviews, revoked feature flags, anonymized identifiers, or retention-expired data.
- Tests must compare the manifest's governed-artifact versions and content hashes, including the governed-bundle canonicalization profile version/hash, policy-composition bundle version/hash, artifact-transition policy bundle version/hash, artifact-dependency policy version/hash, policy-action-kind registry version/hash, purpose-registry version/hash, signal-taxonomy version/hash, safety-blocker taxonomy version/hash, claim-assurance taxonomy version/hash, retention-policy bundle version/hash, aggregate-release policy bundle version/hash, queue-freshness control version/hash, external-processor policy version/hash, sensitive-audit-chain policy version/hash, output-schema bundle version/hash, UI-copy bundle version/hash, client-surface integrity policy version/hash, and tool-capability bundle version/hash, against route contracts, output schemas, policy-decision fixtures, worker configuration, phase-gate bundles, tool-capability manifests, and documentation so policy-critical drift fails closed before promotion.

## `background_governed_bundle_canonicalization_profiles`

Use an existing signed-config canonicalization system if present; otherwise add a compact governed typed-configuration bundle or table for materializing and hashing every release-manifest-bound governed artifact. This table defines the semantics of "canonical content hash"; it is not a user-facing product surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `canonicalization_profile_version` | `text not null` |
| `canonicalization_profile_hash` | `text not null`; canonical content hash over this canonicalization/materialization profile |
| `supersedes_canonicalization_profile_version` | `text nullable`; previous profile if this is a governed replacement |
| `included_bundle_families` | `text[] not null`; governed bundle families covered by this profile |
| `materialization_query_refs` | `text[] not null`; stable references to the server-side queries or typed-config paths used to materialize complete bundles |
| `record_selection_rules_hash` | `text not null`; hash of status/environment/scope/phase/locale selection rules |
| `field_inclusion_rules_hash` | `text not null`; hash of exact fields included/excluded for each governed bundle family |
| `row_ordering_rule` | `text not null`; deterministic ordering rule for bundle rows |
| `array_ordering_rule` | `text not null`; deterministic handling for ordered and unordered arrays |
| `null_empty_missing_policy` | `text not null`; deterministic handling for null, empty arrays/objects, omitted fields, and default values |
| `unicode_normalization` | enum: `NFC | NFKC | repository_standard` |
| `timestamp_encoding` | `text not null`; deterministic timezone/precision format |
| `number_boolean_encoding` | `text not null`; deterministic numeric and boolean encoding rule |
| `hash_algorithm` | enum: `sha256 | sha512 | repository_standard` |
| `profile_record_hash` | `text not null`; hash of this profile row's canonical policy fields |
| `status` | enum: `draft | active | deprecated | disabled` |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |

Governed-bundle canonicalization requirements:

- The active release/config manifest's `governed_bundle_canonicalization_profile_version` and `governed_bundle_canonicalization_profile_hash` must resolve to an active canonicalization profile before any governed bundle hash can authorize a policy decision, route, worker, screen, export, telemetry path, retention job, or rollout gate.
- The same logical governed bundle must produce the same hash in route handlers, workers, CI, migrations, admin tools, and policy-decision consumption. Different semantics, missing rows, wrong environment/scope, wrong locale, wrong phase, wrong status filter, wrong default values, wrong ordering, or wrong included-field rules must produce a different hash or fail closed.
- Canonicalization profiles are append-only after activation. Changing included fields, materialization queries, row selection, sorting, null/empty/default handling, timestamp encoding, Unicode normalization, hash algorithm, or bundle-family coverage requires a new profile version/hash and governed manifest activation.
- CI and promotion tests must recompute every active governed bundle hash using the active canonicalization profile and compare it against the release manifest, policy-decision fixtures, route contracts, workers, docs, migrations, and admin tools. Partial materialization, same-version mutation, client/operator-supplied hashes, stale canonicalization profiles, non-deterministic serialization, or hash mismatch fails closed before promotion.

## `background_phase_gate_bundles`

Use an existing feature-gate / route-registry system if present; otherwise add a compact governed table or typed configuration bundle for phase-scoped lane availability. This is the executable allow/deny matrix for the current implementation phase; it is not documentation and not a user-facing product surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `bundle_version` | `text not null` |
| `bundle_hash` | `text not null`; canonical content hash over the complete sorted lane matrix for this bundle version and phase |
| `supersedes_bundle_version` | `text nullable`; previous bundle if this is a governed replacement |
| `background_networking_phase` | enum: `phase_0_policy_skeleton \| phase_1_internal_staff_core \| phase_2_source_summary_intro_skeleton \| phase_3_tiny_cohort_partner_pilot \| phase_4_higher_power_lanes \| full_mature_system` |
| `lane_key` | `text not null`; stable key for one route, worker, UI panel, queue consumer, export path, telemetry path, partner callback, source-summary path, LLM path, intro path, disclosure path, vault path, aggregate-report path, or federation path |
| `lane_kind` | enum: `route \| worker \| ui_panel \| queue_consumer \| export_path \| telemetry_path \| partner_callback \| source_summary_path \| llm_path \| intro_path \| disclosure_path \| vault_path \| aggregate_report_path \| federation_path \| retention_job \| docs_page \| test_suite` |
| `lane_state` | enum: `enabled \| staff_only \| shadow_only \| canary \| disabled_stub \| blocked` |
| `allowed_action_kinds` | `text[] not null default '{}'`; exact policy-decision action kinds this lane may perform |
| `required_feature_flag_states` | `jsonb not null default '{}'`; feature flags required to be true/false for this lane |
| `required_risk_review` | `boolean not null default false` |
| `required_pilot_evaluation` | `boolean not null default false` |
| `generic_unavailable_code` | `text not null`; requester/counterparty-safe response code used when the lane is disabled or blocked |
| `lane_record_hash` | `text not null`; hash of this lane row's canonical policy fields |
| `status` | enum: `draft \| active \| deprecated \| disabled` |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |

Phase-gate bundle requirements:

- The active release/config manifest's `phase_gate_bundle_version` and `phase_gate_bundle_hash` must resolve to an active, complete, content-addressed phase-gate bundle for the same `background_networking_phase`.
- The phase-gate bundle is default-deny. Every registered background-networking route, worker, UI panel, queue consumer, outbox path, export path, telemetry path, partner callback, source-summary path, LLM path, intro path, disclosure path, vault path, aggregate-report path, federation path, retention job, public-contract route, docs page, and phase-specific test suite must have exactly one active lane record in the hashed bundle or fail closed.
- A lane in `disabled_stub` or `blocked` state may return only a generic unavailable/stale/deny response and must not enqueue work, score candidates, create opportunity briefs, send notifications, create intro requests, disclose fields, export data, call partners, emit sensitive telemetry, or mutate grants.
- Feature flags may narrow or disable a lane, but they must not widen a lane beyond the active phase-gate bundle. A feature flag, environment variable, operator action, partner callback, route registration, worker registration, or UI branch that conflicts with the active lane state fails closed.
- A lane in `staff_only`, `shadow_only`, or `canary` state must be enforced server-side by the policy evaluator and must not rely on client-side UI hiding, docs copy, or test naming conventions.
- Every policy decision for an action on a lane must snapshot `background_networking_phase`, `phase_gate_bundle_version`, `phase_gate_bundle_hash`, and `phase_lane_key`; a policy decision for one lane must not authorize another lane.
- CI and promotion tests must recompute the canonical bundle hash and compare the active lane matrix against route files, API contracts, worker registrations, queue consumers, feature flags, public documentation, telemetry builders, export builders, and test files. Unregistered lanes, stale docs, orphaned tests, same-version in-place mutations, bundle-hash mismatches, or reachable future-phase code paths fail closed.
- Activated phase-gate bundle rows are append-only. Changing a lane from `disabled_stub`, `blocked`, `shadow_only`, or `staff_only` to a broader state, changing `allowed_action_kinds`, changing feature-flag requirements, removing risk-review or pilot-evaluation requirements, or changing user-visible unavailable behavior requires a new `bundle_version`, new `bundle_hash`, and high-impact governance approval when it could expose ordinary users, candidates, counterparties, partners, exports, aggregate reports, vault fields, source summaries, intros, disclosure, federation, or telemetry.


## `background_candidate_reference_handles`

Use an existing tokenization / private-reference primitive if present; otherwise add a compact internal table for run-scoped pseudonymous candidate handles. This table prevents matching workers, receipts, diagnostics, exports, and telemetry from using stable candidate identifiers as ordinary working keys.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `delegate_run_id` | `uuid not null` |
| `handle_token` | `text not null unique`; random or keyed token scoped to one run/action family |
| `candidate_profile_id` | `uuid nullable`; service-role/identity-service only while `handle_state = active` |
| `purpose_code` | `text not null` |
| `purpose_policy_version` | `text not null` |
| `cohort_scope_id` | `text nullable` |
| `handle_state` | enum: `active \| redacted \| anonymized \| expired` |
| `allowed_resolution_reasons` | `text[] not null default '{}'`; e.g. `operator_review`, `mutual_consent`, `safety_hold`, `legal_hold` |
| `policy_decision_id` | `uuid nullable`; required for any resolution attempt |
| `retention_expires_at` | `timestamptz not null` |
| `resolved_at` | `timestamptz nullable` |
| `redacted_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |

Candidate-reference handle requirements:

- Delegate matching, scoring, anti-probing, non-surfaced evaluation, receipts, diagnostics, telemetry, and policy-decision dependencies must use `handle_token` or repository-equivalent blinded references, not stable candidate profile ids.
- The mapping from handle to stable profile/account/contact identifiers is service-role/identity-service only and must not be available to ordinary route handlers, client components, analytics, exports, partner callbacks, or LLM tools.
- Handles are scoped to one run or explicitly registered action family and must not be reused across runs to build a linkable candidate graph.
- Resolution requires a fresh action-specific policy decision and a permitted reason. Bulk resolution, debugging resolution, analytics resolution, and requester-visible resolution are forbidden.
- On redaction, anonymization, expiry, privacy freeze, candidate exposure revocation, participant deletion, or retention cleanup, clear or irreversibly coarsen the stable mapping so the handle cannot be joined back to a candidate.

## `background_subject_identity_profiles`

Use an existing account / organisation / collective identity model if present; otherwise add a compact subject-identity table. This table describes what kind of subject a profile represents without making exact identity disclosure part of broad matching.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `subject_kind` | enum: `individual \| organisation \| collective \| automated_agent \| service_account \| partner_operator` |
| `sanitized_subject_label` | `text not null`; broad label such as `individual`, `organisation`, `collective`, or `automated helper`, not exact identity |
| `human_accountable_owner_id` | `uuid nullable`; required for non-individual, automated, service-account, or partner/operator subjects |
| `representative_authority_state` | enum: `not_required \| pending \| confirmed \| disputed \| expired \| revoked` |
| `representative_authority_scope` | `jsonb not null default '{}'`; purpose codes, surfaces, cohorts, partner lanes, and expiry covered by the authority |
| `automation_disclosure_state` | enum: `not_automated \| disclosed_broadly \| pending_review \| blocked` |
| `authority_expires_at` | `timestamptz nullable` |
| `subject_identity_version` | `text not null` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Subject-identity requirements:

- Non-human, automated, organisation, collective, service-account, and partner/operator subjects must not be scored, surfaced, prompted, or advanced into intro flows unless their authority and accountability records are current for the selected purpose, surface, and scope.
- Automated or organisational subjects must not masquerade as ordinary individuals. Sanitized subject-kind labels may be shown where needed for meaningful consent, but exact identities, staff names, contact details, internal roles, and partner-seat details remain hidden until the proper consent/disclosure stage.
- A change to subject kind, automation state, authority scope, accountability owner, or authority expiry must update `subject_identity_version`, mark dependent active artifacts stale, and invalidate relevant policy decisions, caches, receipts, exports, partner outputs, and intro requests.
- Subject identity must not be inferred solely from imported text, email/calendar contacts, partner payloads, model guesses, or public URLs; ambiguous subject identity fails closed for surfacing and intro advancement.


## `background_participant_privacy_freezes`

Use an existing account pause / safety hold primitive if present; otherwise add a participant-owned privacy-freeze table. This is a participant safety control, not a moderation label, ranking input, or requester-visible status.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `state` | enum: `active \| released \| expired` |
| `freeze_kind` | enum: `participant_panic \| account_security \| harassment_risk \| coercion_risk \| privacy_review \| operator_safety` |
| `scope` | enum: `all_background_networking \| outbound_delegate_runs \| inbound_delegate_discovery \| intro_and_disclosure \| exports_only` |
| `reason_code` | `text nullable`; participant-visible or redacted operator-safe code |
| `redacted_summary` | `text nullable` |
| `activated_by` | `uuid not null` or repository-standard actor identifier |
| `requires_step_up_release` | `boolean not null default true` |
| `release_policy_decision_id` | `uuid nullable` |
| `expires_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |
| `released_at` | `timestamptz nullable` |

Privacy-freeze requirements:

- An active freeze is a hard blocker for every in-scope delegate run, surfacing, notification, intro, disclosure, export, partner/federation output, cache render, and nonessential operator reveal.
- Freeze activation must cancel or pause queued work, suppress unsent outbox rows, mark active briefs/intros/disclosure surfaces stale or frozen, invalidate caches/exports, and preserve participant revocation paths.
- Freeze state and reason must not be exposed to requesters, counterparties, partners, public reports, or telemetry except as generic stale/unavailable labels.
- Release requires step-up authentication or repository-equivalent reauthentication, a fresh policy decision, and recomputation from currently valid inputs; release must not automatically resume stale artifacts.

## `background_participant_data_exports`

Use an existing account-export system if present; otherwise add a compact table for sanitized participant-owned data access and portability jobs.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `export_state` | enum: `queued \| running \| ready \| expired \| cancelled \| failed` |
| `export_scope` | enum: `own_profile_and_consents \| own_source_metadata \| own_receipts \| own_disclosure_grants \| all_sanitized_background_data` |
| `output_schema_version` | `text not null` |
| `policy_decision_id` | `uuid not null` |
| `contains_exact_vault_fields` | `boolean not null default false`; normally false; exact vault export requires a separate exact-data export policy outside matching surfaces |
| `download_url_expires_at` | `timestamptz nullable` |
| `retention_expires_at` | `timestamptz not null` |
| `created_at` | `timestamptz` |
| `completed_at` | `timestamptz nullable` |

Participant-export requirements:

- Export jobs must be generated from sanitized allowlist schemas and participant-owned records only.
- Exports must exclude candidate/counterparty identifiers, internal candidate handles, hidden blockers, exact gate outcomes, internal policy decisions, abuse heuristics, rare-combination internals, private cohort membership of others, partner-seat data, raw source text, and any third-party private data.
- Export generation, download, and cache/storage must revalidate privacy-freeze, retention, emergency-control, disclosure-grant, and output-schema state.
- Export files must be encrypted at rest, short-lived, non-indexed, non-analytics, and deleted or invalidated on expiry, revocation, freeze activation, participant deletion, or relevant retention cleanup.


## `background_participant_ui_screen_states`

Use an existing server-driven UI-state / view-model system if present; otherwise add a compact participant-facing screen-state table or typed projection contract. This is the product-safety boundary for Background Delegate UI. It is not a matching surface and must not contain internal candidate identifiers, hidden blockers, exact gate outcomes, or internal policy-decision snapshots.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable projection id |
| `participant_id` | `uuid not null` |
| `screen_key` | enum: `delegate_onboarding \| control_center \| synthetic_preview \| delegate_authorization \| inbound_exposure \| wish_profile \| source_summary_review \| opportunity_inbox \| opportunity_detail \| intro_status \| counterparty_intro_prompt \| disclosure_grant \| receipts \| data_export \| correction_request \| privacy_freeze` |
| `screen_state` | enum: `available \| disabled_stub \| blocked \| stale \| needs_review \| frozen \| unavailable` |
| `output_schema_version` | `text not null` |
| `output_schema_bundle_version` | `text not null` |
| `output_schema_bundle_hash` | `text not null` |
| `ui_copy_bundle_version` | `text not null`; UI-copy bundle used for labels, privacy-impact summaries, unavailable states, accessibility labels, and consent-critical copy on this screen |
| `ui_copy_bundle_hash` | `text not null`; canonical content hash of the active UI-copy bundle used by this screen projection |
| `ui_safety_review_id` | `uuid nullable`; required for enabled non-staff or high-impact screens/actions covered by UI-safety/comprehension review gates |
| `policy_decision_id` | `uuid nullable`; required for rendered states that expose actions, current consent/exposure status, exact participant-owned data, exports, or other decision-relevant state |
| `phase_lane_key` | `text not null` |
| `allowed_visible_action_keys` | `text[] not null default '{}'`; UI actions the participant may see for this screen, such as `pause`, `revoke`, `renew`, `confirm_tag`, `request_intro`, `decline`, `not_now`, `let_expire`, `freeze`, or `export` |
| `generic_state_labels` | `jsonb not null default '{}'`; requester-/counterparty-safe display labels, never exact internal gate reasons |
| `privacy_impact_summary_keys` | `text[] not null default '{}'`; copy keys for what data is used, audience/scope, expiry, revocation effect, and hidden data categories |
| `effective_permission_preview_id` | `uuid nullable`; required for screens that enable or widen participant scope |
| `notification_preference_version` | `text nullable`; snapshot for screens that render notification/digest state |
| `copy_locale` | `text not null default 'en'`; locale used for consent-critical copy, dates, times, and retention windows |
| `readability_check_state` | enum: `not_checked \| passed \| failed \| waived_for_disabled_stub` |
| `localization_check_state` | enum: `not_checked \| passed \| failed \| waived_for_disabled_stub` |
| `accessibility_check_state` | enum: `not_checked \| passed \| failed \| waived_for_disabled_stub` |
| `expires_at` | `timestamptz not null` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Participant UI screen-state requirements:

- Participant-facing Background Delegate UI must render from sanitized server-side screen-state DTOs or repository-equivalent projections that physically exclude internal-only columns, candidate identifiers, candidate handles, exact gate outcomes, rare-combination internals, abuse heuristics, internal policy-decision dependency snapshots, and operator notes.
- Synthetic preview screens must be visibly labelled as examples and must be generated only from synthetic or formally redacted fixtures. They must not call live matching, reserve candidate budgets, inspect live cohort sizes, use real candidate-gate distributions, emit matching receipts, or create policy side effects.
- UI screens must be default-deny. If a screen that exposes actions, current consent/exposure status, exact participant-owned data, exports, or other decision-relevant state lacks a current policy decision, active output schema, active phase lane, current output-schema bundle hash, current UI-copy bundle version/hash, current privacy-freeze state, current UI-safety/comprehension review where required, and current retention/export/cache state where applicable, it must render a generic disabled/stale/unavailable state or no screen at all. Purely inert informational or disabled-stub projections may omit `policy_decision_id` only when they expose no actionable controls, no current consent/exposure status, no exact participant-owned data, and no side-effecting next steps, but they must still bind to the current output-schema and UI-copy bundles if they render governed labels.
- Visible action controls must come from `allowed_visible_action_keys` or repository-equivalent server output, not from client-side feature flags, local route checks, hidden DOM state, copied business logic, or optimistic UI inference. A control that appears enabled must still require a fresh action-specific policy decision before any side effect.
- Onboarding, authorization, inbound exposure, source-summary review, high-sensitivity tag confirmation, budget widening, intro request, disclosure grant, data export, correction request, and privacy-freeze flows must include privacy-impact summaries that explain data use, purpose, audience/scope, expiry/reconfirmation, revocation effects, and what remains hidden.
- Screens that enable or widen scope must reference a current effective-permission preview id. The displayed before/after delta must come from the server projection and must not be reconstructed client-side from form state.
- Opportunity cards must say that a brief is not an introduction and must show only generic, non-enumerating reason/factor categories, confidence band, stale/dependency labels, receipt link, and safe next-step options.
- Opportunity, intro, disclosure, renewal, and counterparty-prompt screens must expose low-friction decline/not-now/let-expire choices wherever action is optional. These choices must not require a reason, must not use loss-framed copy, must not be visually hidden beneath engagement-oriented actions, and must map to generic non-disclosing state for the other side.
- Counterparty-facing prompt screens must show only broad purpose, broad requested disclosure categories, generic safety/review state, coarse expiry/review window, and choices such as `review`, `decline`, or `ask_for_more_context`; they must not reveal requester identity, exact wishes, exact targeting reason, private cohort membership, or internal requester/candidate identifiers before the proper consent stage.
- Screen-state rendering must satisfy the active client-surface integrity policy for the screen: no sensitive identifiers in URLs, no third-party script/resource loads unless explicitly allowlisted for the lane, no referrer leakage, no persistent offline cache for sensitive screen payloads, no debug query parameters, and no broad browser storage of screen-state DTOs.
- Screen-state payloads, cached UI hydration blobs, local storage, and offline snapshots must be short-lived and invalidated by revocation, privacy freeze, source-summary revocation, candidate exposure change, disclosure grant change, output-schema bundle change, UI-copy bundle change, UI-safety review expiry/failure, emergency control, or retention cleanup.
- Accessibility, localization, and readability failures block promotion for enabled user-facing screens. Disabled stubs may use `waived_for_disabled_stub` only if they expose no sensitive state or side-effecting controls. Consent-critical copy must avoid icon-only, color-only, untranslated, or jurisdiction/time-zone-ambiguous communication of scope, expiry, revocation, or hidden-data categories.

## `background_ui_copy_bundles`

Use an existing i18n / copy-governance system if present; otherwise add a compact content-addressed governed copy bundle for Background Delegate UI, consent, notification, receipt, unavailable-state, accessibility, localization, and prompt text. This registry is a consent and disclosure boundary, not a CMS convenience or growth-experiment surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `ui_copy_bundle_version` | `text not null` |
| `ui_copy_bundle_hash` | `text not null`; canonical content hash over the complete sorted UI-copy registry for this version |
| `supersedes_ui_copy_bundle_version` | `text nullable`; previous copy bundle if this is a governed replacement |
| `copy_key` | `text not null`; stable key, unique within `ui_copy_bundle_version` and locale |
| `copy_surface` | enum: `plain_language_term_map | onboarding | consent_dialog | privacy_impact_summary | effective_permission_preview | opportunity_card | intro_prompt | counterparty_prompt | notification | receipt | unavailable_state | correction_export | privacy_freeze | accessibility_label | docs_excerpt` |
| `audience_scope` | enum: `participant_owner | requester | candidate | counterparty | operator_redacted | partner_sanitized | public_docs` |
| `locale` | `text not null`; repository-standard locale code |
| `copy_text_ref` | `text not null`; reviewed copy text or typed-config reference, never raw source/user text |
| `required_privacy_impact_elements` | `text[] not null default '{}'`; e.g. `data_used`, `purpose`, `audience_scope`, `expiry`, `revocation_effect`, `hidden_categories` |
| `prohibited_copy_patterns` | `text[] not null default '{}'`; e.g. urgency, scarcity, popularity, shame, broad-consent bundling, candidate-specific gates, engagement nudges, unsafe euphemisms, unexplained internal jargon |
| `plain_language_term_keys` | `text[] not null default '{}'`; governed user-facing term-map keys used by this copy row |
| `technical_detail_copy_key` | `text nullable`; optional secondary copy key for a precise sanitized technical explanation |
| `reading_level_state` | enum: `not_checked | passed | failed | waived_for_internal_only` |
| `accessibility_state` | enum: `not_checked | passed | failed | waived_for_disabled_stub` |
| `localization_review_state` | enum: `not_required | pending | passed | failed` |
| `allowed_action_kinds` | `text[] not null default '{}'` |
| `allowed_screen_keys` | `text[] not null default '{}'` |
| `copy_record_hash` | `text not null`; hash of this copy row's canonical policy fields and reviewed text reference |
| `status` | enum: `draft | active | deprecated | disabled` |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |
| `deprecated_at` | `timestamptz nullable` |

UI-copy bundle requirements:

- The active release/config manifest's `ui_copy_bundle_version` and `ui_copy_bundle_hash` must resolve to an active, complete, content-addressed UI-copy bundle before participant-facing or counterparty-facing Background Delegate screens, effective-permission previews, consent dialogs, notifications, receipts, unavailable labels, or public-contract copy can render.
- High-impact consent, exposure, budget widening, high-sensitivity tag confirmation, vault reveal, disclosure grant, partner/public exposure, notification preference, correction/export, and privacy-freeze copy must use active copy keys from that exact bundle. Missing, disabled, stale-version, stale-hash, wrong-locale, wrong-screen, or wrong-action copy fails closed to a generic unavailable state.
- Activated copy rows are append-only. Adding a copy key, changing consent semantics, weakening a privacy-impact element, weakening accessibility/localization requirements, adding urgency/scarcity/popularity/shame language, changing unavailable-state wording, adding notification-opening incentives, or changing audience/screen/action bindings requires a new `ui_copy_bundle_version`, new `ui_copy_bundle_hash`, and privacy/product-safety review where applicable.
- High-impact Background Delegate copy must not be A/B tested, growth-optimized, personalized for conversion, or changed by ordinary CMS edits outside the governed manifest path. Experiments may compare comprehension or safety using synthetic/redacted fixtures only and must not alter active consent semantics or notification pressure without governed activation.
- UI-copy payloads must not include raw source text, exact wishes, candidate identifiers, counterparty identifiers, hidden blockers, rare-combination internals, policy-decision dependency snapshots, abuse heuristics, or exact gate outcomes.
- CI and promotion tests must recompute the canonical UI-copy bundle hash and compare active copy keys against screen-state DTOs, output schemas, notification builders, receipt renderers, consent dialogs, effective-permission previews, accessibility labels, localization files, docs, and tests. Same-version in-place mutation, stale docs, orphaned tests, unreviewed translation drift, prohibited-copy patterns, partial bundle materialization, client-supplied copy-bundle claims, or copy-bundle hash mismatches fail closed before promotion.

## `background_ui_plain_language_terms`

Use an existing i18n / terminology-governance system if present; otherwise include this as a typed configuration bundle under the active UI-copy bundle. This is the default participant-facing vocabulary map for simplifying Background Delegate screens without changing the underlying safety model.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `ui_copy_bundle_version` | `text not null` |
| `ui_copy_bundle_hash` | `text not null`; canonical content hash of the UI-copy bundle containing this term map |
| `term_key` | `text not null`; stable user-facing concept key, unique within bundle and locale |
| `internal_concept_keys` | `text[] not null`; implementation concepts covered by this term, e.g. `delegate_authorization`, `candidate_exposure`, `opportunity_brief`, `disclosure_grant` |
| `default_user_label` | `text not null`; short plain-language label |
| `short_explanation_ref` | `text not null`; reviewed one- or two-sentence explanation reference |
| `technical_detail_copy_key` | `text nullable`; optional copy key for sanitized technical explanation |
| `required_context_elements` | `text[] not null default '{}'`; privacy/safety elements that must accompany this term when action-bearing |
| `prohibited_substitutions` | `text[] not null default '{}'`; euphemisms, vague labels, or jargon that must not be used for this concept |
| `locale` | `text not null` |
| `reading_level_state` | enum: `not_checked | passed | failed | waived_for_internal_only` |
| `accessibility_state` | enum: `not_checked | passed | failed | waived_for_disabled_stub` |
| `term_record_hash` | `text not null`; hash of this term row's canonical fields and reviewed text references |
| `status` | enum: `draft | active | deprecated | disabled` |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |

Plain-language term requirements:

- The active UI-copy bundle must include active term-map entries for every default participant-facing action-bearing Background Delegate concept, including outbound search, inbound exposure, wish/profile signals, source-summary review, opportunity briefs, intro requests, field-level disclosure, exports, receipts, notification preferences, correction requests, and privacy freeze.
- Default participant-facing screens should use `default_user_label` and `short_explanation_ref`; implementation terms may appear only in explicit “Technical details” panels, developer docs, operator/admin surfaces, or public contracts where precision is needed.
- Plain-language labels are not waiver mechanisms. They must not hide or soften privacy, exposure, retention, candidate-burden, disclosure, or revocation effects. Required context elements still need to be shown by the screen-state DTO or privacy-impact summary.
- The term map must preserve the existing separation between outbound delegate authorization and inbound candidate exposure, between opportunity briefs and introductions, between source-summary approval and tag confirmation, and between mutual consent and exact field/contact disclosure.
- Deprecated, missing, wrong-locale, wrong-bundle-hash, failed-reading-level, failed-accessibility, or prohibited-substitution term rows fail closed for action-bearing participant screens and consent dialogs.
- CI and promotion tests must compare default screen copy, effective-permission previews, opportunity cards, intro prompts, receipts, notification copy, privacy-freeze copy, localization files, and docs excerpts against the active term map. Unexplained internal jargon in default participant-facing UI, unsafe euphemisms, stale translations, term-map hash mismatch, or term-map copy outside the governed bundle fails closed before promotion.

## `background_client_surface_integrity_policies`

Use an existing frontend security-policy / CSP registry if present; otherwise add a compact content-addressed governed policy bundle for Background Delegate client surfaces. This bundle governs browser-level leakage controls; it is not a product analytics or growth surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `client_surface_integrity_policy_version` | `text not null` |
| `client_surface_integrity_policy_hash` | `text not null`; canonical content hash over the complete sorted client-surface integrity policy bundle for this version |
| `supersedes_client_surface_integrity_policy_version` | `text nullable`; previous policy version if this is a governed replacement |
| `surface_key` | `text not null`; stable screen, route, notification-link, export, receipt, or UI-hydration surface key |
| `audience_scope` | enum: `participant_owner | requester | candidate | counterparty | operator_redacted | partner_sanitized | public_docs` |
| `allowed_script_origins` | `text[] not null default '{}'`; empty by default for sensitive surfaces |
| `allowed_style_font_image_origins` | `text[] not null default '{}'`; minimum necessary allowlist |
| `allowed_connect_origins` | `text[] not null default '{}'`; repository/API origins only unless governed otherwise |
| `third_party_resource_policy` | enum: `forbidden | allowlisted_static_only | governed_exception` |
| `content_security_policy_ref` | `text not null`; stable CSP template or generated policy reference |
| `referrer_policy` | enum: `no_referrer | same_origin | strict_origin_when_cross_origin` |
| `sensitive_url_policy` | enum: `no_sensitive_query_params | opaque_short_lived_route_tokens_only | public_docs_only` |
| `service_worker_cache_policy` | enum: `forbidden_for_sensitive | sanitized_short_ttl_only | public_docs_only` |
| `browser_storage_policy` | enum: `memory_only | sanitized_short_ttl | public_docs_only` |
| `iframe_embedding_policy` | enum: `deny | same_origin_only | governed_exception` |
| `sri_required` | `boolean not null default true` |
| `policy_record_hash` | `text not null`; hash of this client-surface policy row's canonical policy fields |
| `status` | enum: `draft | active | deprecated | disabled` |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |

Client-surface integrity requirements:

- The active release/config manifest's `client_surface_integrity_policy_version` and `client_surface_integrity_policy_hash` must resolve to an active complete client-surface integrity bundle for every enabled Background Delegate screen, notification link, export page, receipt view, consent dialog, intro prompt, and UI hydration path.
- Sensitive Background Delegate surfaces must not put participant ids, candidate handles, intro ids, disclosure-grant ids, consent states, gate labels, or exact field keys in URLs, query strings, browser history, referrers, debug parameters, third-party requests, or persistent client storage. Use short-lived opaque route tokens where deep links are needed, and revalidate server-side before rendering.
- Third-party scripts, pixels, iframes, fonts, images, service-worker caches, browser extensions integrations, or cross-origin resource loads are forbidden on sensitive surfaces unless the exact origin and purpose are allowlisted in the active policy bundle, covered by UI-safety review, output-schema constraints, and retention/cache invalidation tests.
- Client-surface policy rows are append-only after activation. Widening an origin allowlist, weakening CSP, weakening referrer or URL policy, enabling persistent browser storage, enabling service-worker caching, or allowing iframes requires a new policy version/hash, privacy/security review, and governed manifest activation.
- CI and promotion tests must compare the active client-surface integrity policy against route metadata, headers, CSP generation, link builders, notification URLs, export URLs, service-worker config, UI hydration code, and frontend bundles. Missing headers, sensitive query parameters, referrer leakage, third-party resource loads, service-worker persistence, same-version mutation, stale docs, or policy-hash mismatch fails closed before promotion.

## `background_external_processor_policies`

Use an existing vendor / subprocessors governance system if present; otherwise add a compact content-addressed governed table or typed configuration bundle for external processors that can touch Background Delegate payloads, notification metadata, logs, support artifacts, delivery events, translations, accessibility tooling, or export delivery. This table governs processor use only; it is not a user-facing analytics surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `external_processor_policy_version` | `text not null` |
| `external_processor_policy_hash` | `text not null`; canonical content hash over the complete sorted external-processor policy bundle for this version |
| `processor_key` | `text not null`; stable processor or delivery-provider identifier |
| `processor_kind` | enum: `email_delivery | sms_delivery | push_delivery | cdn | error_monitoring | cloud_logging | support_tool | translation_service | accessibility_tool | fraud_or_abuse_vendor | other_processor` |
| `allowed_lane_keys` | `text[] not null default '{}'` |
| `allowed_action_kinds` | `text[] not null default '{}'` |
| `allowed_data_classes` | `text[] not null`; e.g. `generic_notification_metadata`, `sanitized_payload`, `aggregate_metric`, `redacted_support_context` |
| `forbidden_data_classes` | `text[] not null default '{}'`; exact wishes, raw source text, contact details, candidate identifiers, message content, gate states, and hidden abuse heuristics must be forbidden by default |
| `delivery_telemetry_policy` | enum: `none | aggregate_only | coarse_delivery_only | processor_internal_only` |
| `retention_window` | `interval not null` or repository-standard duration |
| `subprocessor_policy_ref` | `text nullable`; redacted reference to approved subprocessors if needed |
| `requires_risk_review` | `boolean not null default true` |
| `processor_record_hash` | `text not null`; hash of this processor row's canonical policy fields |
| `status` | enum: `draft | active | deprecated | disabled` |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |

External-processor requirements:

- The active release/config manifest's `external_processor_policy_version` and `external_processor_policy_hash` must resolve to an active, complete, content-addressed external-processor policy bundle before any Background Delegate payload or metadata is sent to a processor.
- Processor use is default-deny. A notification builder, export delivery job, support tool, error monitor, CDN path, translation path, or accessibility tool may use only an active processor record matching its lane, action kind, output schema, data class, and retention class.
- Processors must not receive raw source text, exact wishes, exact contact fields, candidate/counterparty identifiers, run-scoped candidate handles, private cohort membership, candidate-specific gate labels, rare-combination internals, message content, delivery/open/click states, or hidden abuse heuristics.
- Delivery/open/click telemetry from processors must not be returned to requester-facing or counterparty-facing clients and must not become a matching, reputation, engagement, or notification-priority signal.
- Processor policy changes that add a processor, widen data classes, enable delivery telemetry, add subprocessors, extend retention, or weaken risk-review requirements require a new policy version/hash and governed manifest activation.
- CI and promotion tests must recompute the processor-policy hash and compare route/link builders, notification builders, export delivery jobs, support tooling, error monitoring, CDN configuration, localization/accessibility tooling, and documentation against the active processor policy.

## `background_effective_permission_previews`

Use an existing permission-preview / consent-diff system if present; otherwise add a compact participant-owned table or typed projection contract for short-lived before/after previews. This is a comprehension and consent-safety artifact, not an authorization, matching surface, or candidate-discovery surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable projection id |
| `participant_id` | `uuid not null` |
| `preview_kind` | enum: `delegate_authorization \| inbound_exposure \| tag_confirmation \| source_summary_tag_application \| candidate_budget_widening \| partner_or_public_exposure \| intro_request \| disclosure_grant \| exact_data_export \| vault_reveal \| privacy_freeze_release \| notification_preference` |
| `proposed_action_kind` | `text not null`; exact governed action kind that would later require confirmation and policy evaluation |
| `current_effective_permission_summary` | `jsonb not null`; generic labels only |
| `proposed_effective_permission_summary` | `jsonb not null`; generic labels only |
| `data_use_delta_keys` | `text[] not null default '{}'` |
| `audience_scope_delta_keys` | `text[] not null default '{}'` |
| `surface_delta_keys` | `text[] not null default '{}'` |
| `expiry_or_reconfirmation_delta_label` | `text nullable` |
| `revocation_effect_summary_keys` | `text[] not null default '{}'` |
| `hidden_data_category_keys` | `text[] not null default '{}'` |
| `risk_label` | enum: `low \| medium \| high` |
| `output_schema_version` | `text not null` |
| `output_schema_bundle_version` | `text not null` |
| `output_schema_bundle_hash` | `text not null` |
| `ui_copy_bundle_version` | `text not null`; UI-copy bundle used for the preview's participant-facing labels and privacy-impact text |
| `ui_copy_bundle_hash` | `text not null`; canonical content hash of the active UI-copy bundle used by this preview |
| `copy_locale` | `text not null default 'en'` |
| `policy_decision_id` | `uuid not null`; policy decision for rendering the preview, not for performing the proposed side effect |
| `dependency_snapshot` | `jsonb not null`; redacted version labels only |
| `preview_state` | enum: `active \| consumed \| stale \| expired \| cancelled` |
| `expires_at` | `timestamptz not null` |
| `consumed_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |

Effective-permission preview requirements:

- A preview is required before any participant action that enables or widens outbound delegate authorization, inbound candidate exposure, high-sensitivity tag confirmation, source-summary tag application, candidate budget, partner/public/federation exposure, intro request, field-level disclosure grant, exact-data export, vault reveal, or privacy-freeze release.
- The preview must be generated server-side under the current release manifest, policy-composition bundle, output-schema bundle, UI-copy bundle, phase-gate bundle, purpose registry, signal taxonomy, claim-assurance taxonomy where applicable, retention-policy bundle, and current consent/exposure/freeze/hold state.
- The preview must not include candidate or counterparty identities, hidden blockers, exact gate outcomes, rare-combination internals, internal policy-decision dependency snapshots, abuse heuristics, or raw/exact source fields. It may show only generic current/proposed state, broad data categories, audience/surface categories, expiry/reconfirmation effects, revocation effects, and hidden-data categories.
- A preview is not an allow decision and cannot be reused to perform a side effect. The later confirmation/action must consume a fresh action-specific policy decision and must verify that the preview is still active, unexpired, exact-action, exact-participant, exact-output-schema, exact-UI-copy-bundle, and dependency-current.
- If a dependency changes, the output schema changes, the UI-copy bundle changes, the release manifest changes, the participant edits the form, or the preview expires, the preview becomes stale and the UI must regenerate it before activation.
- Narrowing, pausing, revoking, freezing, deleting, or declining may proceed without a preview when doing so is safer for the participant, but those actions still require ordinary policy decisions, redacted receipts, and dependent stale/cache/outbox invalidation.

## `background_ui_safety_comprehension_reviews`

Use an existing UX research / launch-readiness review system if present; otherwise add a compact governed review table for consent-critical and safety-critical Background Delegate UI. This table is a rollout gate and product-safety artifact, not a growth-experiment surface, matching feature, or analytics table.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `review_state` | enum: `draft \| passed \| failed \| expired \| revoked \| waived_for_disabled_stub` |
| `background_networking_phase` | enum: `phase_0_policy_skeleton \| phase_1_internal_staff_core \| phase_2_source_summary_intro_skeleton \| phase_3_tiny_cohort_partner_pilot \| phase_4_higher_power_lanes \| full_mature_system` |
| `phase_lane_key` | `text not null` |
| `audience_scope` | enum: `internal_staff \| cohort_only \| partner_matchmaker \| public_broad_preview` |
| `screen_keys` | `text[] not null` |
| `output_schema_bundle_version` | `text not null` |
| `output_schema_bundle_hash` | `text not null` |
| `ui_copy_bundle_version` | `text not null` |
| `ui_copy_bundle_hash` | `text not null` |
| `locale_set` | `text[] not null default '{en}'` |
| `task_scenario_refs` | `text[] not null default '{}'`; synthetic or formally redacted scenario identifiers only |
| `comprehension_check_codes` | `text[] not null`; must cover outbound/inbound split, match-input confirmation, source-summary approval versus tag confirmation, opportunity brief versus introduction, mutual consent versus field-level disclosure, revocation limits, and no-autonomous-outreach expectations where relevant |
| `false_belief_thresholds` | `jsonb not null`; pre-registered pass/fail thresholds |
| `accessibility_evidence_ref` | `text nullable` |
| `readability_evidence_ref` | `text nullable` |
| `localization_evidence_ref` | `text nullable` |
| `redacted_findings_summary` | `text not null` |
| `approved_by` | `text nullable` |
| `approved_at` | `timestamptz nullable` |
| `expires_at` | `timestamptz not null` |
| `created_at` | `timestamptz` |

UI-safety/comprehension review requirements:

- Enabled non-staff, partner-facing, public-broad-preview, high-sensitivity, high-impact-claim, disclosure, vault-reveal, source-summary, intro, export, and privacy-freeze-release screens must reference a current review that exactly covers the phase, lane, screen set, output-schema bundle, UI-copy bundle, locale set, audience scope, and high-impact action family.
- Reviews must use synthetic or formally redacted scenarios by default. They must not expose raw source text, exact wishes, candidate identities, counterparty identities, private cohort membership, or internal gate logic to testers outside the governed safety process.
- Missing, expired, failed, wrong-lane, wrong-locale, wrong-copy-bundle, wrong-output-schema-bundle, or unresolved-critical reviews fail closed for promotion and for the affected enabled screen/action.
- Review results are redacted rollout artifacts. They may guide copy/flow revision but must not become engagement optimization, user ranking, candidate reputation, or match input.

## `background_participant_notification_preferences`

Use an existing notification-preference system if present; otherwise add a compact participant-owned table for Background Delegate attention controls. This is a delivery-safety surface, not a ranking or matching feature.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `preference_version` | `text not null` |
| `state` | enum: `active \| paused \| revoked \| expired` |
| `noncritical_digest_frequency` | enum: `off \| daily \| twice_weekly \| weekly \| monthly` |
| `channel_states` | `jsonb not null default '{}'`; allowed participant-owned channel preferences such as in-app, email, or push |
| `quiet_hours_local` | `jsonb not null default '{}'`; participant-owned quiet-hour window and time zone |
| `max_noncritical_notifications_per_week` | `integer not null default 3` |
| `critical_notice_policy` | enum: `account_security_and_privacy_only \| account_security_privacy_and_expiry \| repository_default` |
| `copy_locale` | `text not null default 'en'` |
| `policy_decision_id` | `uuid not null` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Notification-preference requirements:

- Participant notification preferences may only narrow, batch, pause, or redirect non-critical Background Delegate notifications. They must not force immediate delivery, increase notification priority, bypass fixed digest windows or jitter, override counterparty notification budgets, reveal candidate-specific timing, or turn notification opens/clicks into engagement signals.
- Account-security, privacy-freeze, revocation, deletion, retention, legal/safety, and required expiry/reconfirmation notices may follow the repository's critical-notice policy, but their copy must still be generic and non-disclosing.
- Adding a new external channel, widening direct-notice delivery, or changing an account-security recovery path requires step-up authentication where repository policy requires it.
- Notification preferences must be rendered through sanitized screen-state DTOs and invalidated by privacy freeze, emergency controls, output-schema changes, participant deletion, or notification-policy changes.
- Preference changes produce redacted receipts and must not expose whether specific opportunity briefs, candidates, counterparties, reminders, or hidden gate outcomes existed.

## `background_queue_freshness_controls`

Use an existing queue policy / job freshness system if present; otherwise add a compact content-addressed governed bundle for Background Delegate pending-work freshness, retry, drain, and backpressure behavior. This bundle prevents stale queued work from becoming delayed disclosure, notification, or side-channel leakage.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `queue_freshness_control_version` | `text not null`; content-addressed bundle version containing this queue-freshness rule |
| `queue_freshness_control_hash` | `text not null`; canonical content hash over the complete sorted queue-freshness control bundle for this version |
| `pending_work_kind` | enum: `delegate_run | scoring_job | opportunity_creation | notification_outbox | digest_builder | intro_prompt | export_generation | cache_render | retention_cleanup | partner_callback | telemetry_emit` |
| `phase_lane_key` | `text not null` |
| `allowed_action_kinds` | `text[] not null default '{}'` |
| `max_pending_age` | `interval not null` or repository-standard duration |
| `max_retry_window` | `interval not null` or repository-standard duration |
| `backpressure_behavior` | enum: `pause_lane | stale_pending | cancel_pending | recompute_from_current_inputs | drain_silently_generic` |
| `catch_up_send_allowed` | `boolean not null default false` |
| `side_channel_safe_unavailable_code` | `text not null` |
| `queue_record_hash` | `text not null`; hash of this queue-freshness row's canonical policy fields |
| `status` | enum: `draft | active | deprecated | disabled` |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |

Queue-freshness requirements:

- The active release/config manifest's `queue_freshness_control_version` and `queue_freshness_control_hash` must resolve to an active, complete, content-addressed queue-freshness control bundle before any background-networking work can enqueue, retry, drain, send, export, cache, emit telemetry, call a partner, or run retention cleanup.
- Pending work must snapshot the current manifest, lane, action kind, output schema, dependency versions, queue-freshness control version/hash, and maximum freshness window at enqueue time; execution must request a fresh policy decision and revalidate current dependencies before any side effect.
- Work whose dependencies changed, whose freshness window expired, or whose lane is under backpressure must stale, cancel, recompute from current inputs, or drain silently through generic unavailable states. It must not send delayed catch-up notifications, create old opportunity briefs, advance old intro prompts, export stale snapshots, or leak backlog timing.
- Activated queue-freshness rows are append-only. Increasing freshness windows, allowing catch-up sends, weakening backpressure behavior, widening retry windows, or changing unavailable codes requires a new bundle version/hash and governed manifest activation.
- Queue-health telemetry must be aggregate/redacted and must not expose candidate-specific reasons, exact queue timing, hidden gate outcomes, raw source text, exact wishes, or private cohort membership.

## `background_safety_blocker_taxonomy`

Use an existing trust-and-safety policy registry if present; otherwise add a compact content-addressed governed taxonomy table or typed configuration bundle for prohibited coordination, abuse, and harmful-coordination blockers. This taxonomy is a non-waivable safety layer, not a ranking feature.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `safety_blocker_taxonomy_version` | `text not null`; content-addressed bundle version containing this blocker rule |
| `safety_blocker_taxonomy_hash` | `text not null`; canonical content hash over the complete sorted safety-blocker taxonomy for this version |
| `supersedes_safety_blocker_taxonomy_version` | `text nullable`; previous taxonomy version if this is a governed replacement |
| `blocker_code` | `text not null`; stable allowlisted blocker code |
| `blocker_family` | enum: `illegal_coordination | coercion | collusion | price_fixing | fraud | harassment | doxxing | extortion | intimidation | sanctions_evasion | harmful_dual_use | unsafe_reliance | other_harmful_coordination` |
| `severity` | enum: `review_required | hard_block | emergency_stop_trigger` |
| `blocked_action_families` | `text[] not null`; e.g. run enqueue, scoring, surfacing, notification, intro, disclosure, partner callback, export, telemetry |
| `allowed_purpose_exceptions` | `jsonb not null default '[]'`; explicit narrow exceptions if any, never client supplied |
| `requires_operator_review` | `boolean not null default true` |
| `requester_safe_reason_code` | `text not null`; generic non-enumerating label |
| `counterparty_safe_reason_code` | `text not null`; generic non-enumerating label |
| `operator_redacted_summary` | `text not null`; no raw source text, exact wishes, or hidden abuse heuristics |
| `blocker_record_hash` | `text not null`; hash of this blocker row's canonical policy fields |
| `status` | enum: `draft | active | deprecated | disabled` |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |

Safety-blocker taxonomy requirements:

- The active release/config manifest's `safety_blocker_taxonomy_version` and `safety_blocker_taxonomy_hash` must resolve to an active, complete, content-addressed safety-blocker taxonomy before delegate runs, scoring, opportunity creation, notification, intro advancement, counterparty prompts, disclosure, partner/federation callbacks, exports, telemetry, aggregate reports, or retention exceptions can proceed.
- The taxonomy is the server-side source of truth for prohibited coordination classes, blocked action families, severity, requester-/counterparty-safe labels, operator review requirements, and emergency-stop triggers. Prohibited coordination blockers override scores, payment, partner priority, engagement, operator preference, and requester/counterparty demand.
- Unclassified, disabled, deprecated, stale-version, stale-hash, wrong-action-family, missing-review, or wrong-exception blocker states fail closed.
- Activated blocker rows are append-only. Adding a blocker, weakening severity, narrowing blocked action families, adding exceptions, weakening operator-review requirements, changing safe labels in a way that leaks internal reasons, or removing a blocker requires a new taxonomy version/hash, safety review, and governed manifest activation.
- Requester-facing, counterparty-facing, partner-facing, export, telemetry, aggregate, and public-doc outputs must use only generic safe reason codes; they must not expose exact blocker evidence, hidden abuse heuristics, private cohort membership, candidate existence, or source text.
- CI and promotion tests must recompute the canonical safety-blocker taxonomy hash and compare the active taxonomy against delegate-run validators, scoring, policy-decision fixtures, output schemas, intro/disclosure gates, partner/federation callbacks, docs, and public contracts. Same-version in-place mutation, stale docs, orphaned tests, partial taxonomy materialization, client-supplied blocker claims, or taxonomy-hash mismatches fail closed before promotion.

## `background_signal_taxonomy`

Use an existing field-policy / safety-taxonomy registry if present; otherwise add a compact content-addressed governed taxonomy table or typed configuration bundle. This taxonomy classifies every matchable broad field and tag by sensitivity, allowed purposes, allowed surfaces, confirmation/review requirements, and prohibited uses.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` if stored in DB, or stable typed-config id |
| `signal_key` | `text not null`; stable broad field/tag key or namespace pattern |
| `signal_kind` | enum: `profile_field \| confirmed_tag \| source_summary_tag \| constraint \| exclusion \| verification_preference \| availability \| other` |
| `sensitivity_tier` | enum: `low \| medium \| high \| prohibited` |
| `vulnerability_like` | `boolean not null default false` |
| `allowed_purpose_codes` | `text[] not null` |
| `allowed_surface_keys` | `text[] not null` |
| `requires_step_up_confirmation` | `boolean not null default false` |
| `requires_operator_review` | `boolean not null default false` |
| `requires_risk_review` | `boolean not null default false` |
| `public_label` | `text not null`; broad label safe for confirmation UI |
| `prohibited_uses` | `text[] not null default '{}'` |
| `signal_taxonomy_version` | `text not null`; content-addressed taxonomy bundle version containing this signal entry |
| `signal_taxonomy_hash` | `text not null`; canonical content hash over the complete sorted signal-taxonomy registry for this version |
| `supersedes_signal_taxonomy_version` | `text nullable`; previous signal-taxonomy version if this is a governed replacement |
| `signal_record_hash` | `text not null`; hash of this signal row's canonical policy fields |
| `status` | enum: `draft \| active \| deprecated \| disabled` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Signal-taxonomy requirements:

- The active release/config manifest's `signal_taxonomy_version` and `signal_taxonomy_hash` must resolve to an active, complete, content-addressed signal-taxonomy registry. Matching, tag confirmation, source-summary proposal application, opportunity-brief creation, notification, feedback advancement, intro-request creation, disclosure-prompt rendering, and related tests must use that exact taxonomy version/hash.
- The taxonomy is the server-side source of truth for whether a field/tag may influence matching, surfacing, notifications, opportunity briefs, intro requests, or disclosure prompts.
- Unclassified, disabled, deprecated, stale-version, stale-hash, or purpose/surface-incompatible signals fail closed.
- High-sensitivity or vulnerability-like signals may appear in participant-owned review UI only with clear labels and explicit confirmation. They must not become urgency boosts, ranking boosts, engagement signals, or exploitation-priority features.
- Requester-facing and counterparty-facing outputs must genericize or withhold high-sensitivity/vulnerability-like signals unless a later field-level disclosure grant explicitly authorizes exact disclosure.
- Activated taxonomy rows are append-only. Taxonomy changes that broaden use, reduce sensitivity, remove vulnerability-like classification, weaken confirmation/review/risk-review requirements, change prohibited uses, or add purposes/surfaces require a new `signal_taxonomy_version`, new `signal_taxonomy_hash`, privacy/safety review where applicable, and explicit migration/re-confirmation for dependent confirmed tags, source summaries, active briefs, intro requests, and disclosure grants.
- CI and promotion tests must recompute the canonical signal-taxonomy hash and compare the active taxonomy against field/tag validators, source-summary proposal code, tag-confirmation UI, match-input lineage, delegate-run scoring, opportunity-brief rendering, intro-request creation, disclosure-prompt rendering, docs, and public contracts. Same-version in-place mutation, stale docs, orphaned tests, partial taxonomy materialization, client-supplied taxonomy claims, or taxonomy-hash mismatches fail closed before promotion.

## `background_match_signal_lineage`

Use an existing consent/provenance graph if present; otherwise add a compact internal table for active match-input provenance. This table proves that every matchable broad signal remains tied to a current confirmation, taxonomy, purpose, retention, and revocation state.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `signal_key` | `text not null` |
| `signal_kind` | enum: `profile_field \| confirmed_tag \| source_summary_tag \| collective_signal \| partner_grant_signal \| disclosure_grant_broad_field` |
| `signal_value_hash` | `text nullable`; keyed or salted hash for dedupe only, never a public identifier |
| `source_kind` | enum: `wish_profile \| source_summary \| interview_apply \| candidate_exposure \| collective_profile \| partner_grant \| disclosure_grant` |
| `source_id` | `uuid nullable`; internal-only reference |
| `source_version_snapshot` | `text not null` |
| `confirmation_event_id` | `uuid not null` or repository-standard confirmation identifier |
| `allowed_field_key` | `text nullable` |
| `signal_taxonomy_version_snapshot` | `text not null` |
| `signal_taxonomy_hash_snapshot` | `text not null`; canonical hash of the active signal-taxonomy registry used for this lineage record |
| `purpose_code` | `text not null` |
| `purpose_policy_version` | `text not null` |
| `lineage_state` | enum: `active \| stale \| revoked \| expired \| orphaned \| redacted \| anonymized` |
| `retention_expires_at` | `timestamptz not null` |
| `revoked_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Match-signal lineage requirements:

- Deterministic matching must join through active lineage records rather than reading broad fields or confirmed tags directly.
- A lineage record is valid only if the source/profile version, confirmation event, signal-taxonomy version/hash, purpose-code/version binding, retention window, and revocation state all remain current.
- Revoking a source summary, tag confirmation, profile field, disclosure grant, collective authority, partner grant, or purpose binding must mark dependent lineage records stale/revoked and mark dependent active briefs, receipts, intro requests, notifications, caches, exports, and policy decisions stale.
- Lineage rows must not store raw source text, exact wishes, contact details, free-text notes, private third-party data, candidate identifiers, or requester-visible reason strings.
- Redacted/anonymized lineage rows may preserve only non-linkable audit metadata needed for safety or legal obligations and must be unusable for matching, surfacing, notifications, feedback advancement, intro requests, or analytics.

## `background_entity_resolution_claims`

Use an existing identity/organization verification table if present; otherwise add a compact internal table for conservative person, organization, and collective profile resolution. This table is for safety and dedupe under policy control; it is not a requester-facing identity graph.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `subject_profile_id` | `uuid not null` |
| `entity_kind` | enum: `person \| organization \| collective \| partner_seat` |
| `resolution_kind` | enum: `self_claimed \| verified_domain \| verified_document \| operator_confirmed \| partner_attested \| imported_alias \| model_suggested_duplicate` |
| `resolution_state` | enum: `confirmed \| pending_review \| disputed \| rejected \| stale \| expired` |
| `canonical_entity_ref` | `text nullable`; internal-only opaque reference |
| `evidence_redacted_summary` | `text nullable`; no raw identifiers or source text |
| `allowed_purpose_bindings` | `jsonb not null default '[]'` |
| `allowed_surface_keys` | `text[] not null default '{}'` |
| `reviewed_by` | `text nullable` |
| `expires_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Entity-resolution requirements:

- Only `self_claimed`, independently verified, or operator-confirmed `confirmed` resolution claims may be used for candidate identity, organization/collective matching, duplicate-profile dedupe, or disclosure targets.
- `imported_alias`, `model_suggested_duplicate`, partner-attested-but-unconfirmed, pending, disputed, stale, or expired resolution claims must not influence scoring, surfacing, notification, intro creation, disclosure, dedupe, or requester-visible outputs.
- Entity-resolution status, aliases, evidence, confidence, duplicate links, and disputes must not be exposed to requesters, counterparties, partner systems, receipts, diagnostics, telemetry, exports, public reports, or ordinary UI.
- Resolution changes must mark dependent active briefs, intro requests, caches, exports, receipts, and policy decisions stale.


## `background_claim_assurance_taxonomy`

Use an existing verification-policy / assurance-taxonomy registry if present; otherwise add a compact content-addressed governed taxonomy table or typed configuration bundle for high-impact claim classes. This taxonomy defines the minimum assurance, evidence, expiry, review, allowed-purpose, allowed-surface, and reliance-limit rules for claims that could create reliance, authority, safety, funding, credential, legal, medical, immigration, fiscal-sponsorship, scarce-resource, or institutional-affiliation effects.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `claim_assurance_taxonomy_version` | `text not null`; content-addressed taxonomy bundle version containing this claim-assurance rule |
| `claim_assurance_taxonomy_hash` | `text not null`; canonical content hash over the complete sorted claim-assurance taxonomy for this version |
| `supersedes_claim_assurance_taxonomy_version` | `text nullable`; previous taxonomy version if this is a governed replacement |
| `claim_kind` | enum: `credential \| authority \| funding_capacity \| institutional_affiliation \| legal_expertise \| medical_expertise \| immigration_expertise \| fiscal_sponsorship \| scarce_resource \| safety_relevant_capability \| other_high_impact` |
| `broad_claim_key` | `text not null`; stable schema-bound broad claim key or namespace pattern |
| `minimum_assurance_level` | enum: `self_attested \| evidence_submitted \| operator_reviewed \| externally_verified`; minimum level before the claim can influence matching, reliance wording, intro advancement, or disclosure |
| `allowed_purpose_bindings` | `jsonb not null`; `{purpose_code, purpose_policy_version}` bindings for which this claim class may be used |
| `allowed_surface_keys` | `text[] not null` |
| `evidence_requirement_codes` | `text[] not null default '{}'`; evidence or review requirements, stored as policy codes rather than raw evidence |
| `max_validity_window` | `interval nullable` or repository-standard duration; maximum time before re-verification/re-confirmation is required |
| `requires_operator_review` | `boolean not null default true` |
| `reliance_limit_codes` | `text[] not null default '{}'`; limits such as `no_reliance_wording`, `operator_review_required`, `field_grant_required`, or repository-specific equivalents |
| `public_label` | `text not null`; broad user-facing label safe for confirmation UI |
| `prohibited_uses` | `text[] not null default '{}'` |
| `claim_assurance_taxonomy_record_hash` | `text not null`; hash of this taxonomy row's canonical policy fields |
| `status` | enum: `draft \| active \| deprecated \| disabled` |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |
| `deprecated_at` | `timestamptz nullable` |

Claim-assurance taxonomy requirements:

- The active release/config manifest's `claim_assurance_taxonomy_version` and `claim_assurance_taxonomy_hash` must resolve to an active, complete, content-addressed claim-assurance taxonomy before high-impact claims can influence matching, high-confidence briefs, reliance wording, intro advancement, counterparty prompts, field-level disclosure, exports, or requester/counterparty-facing labels.
- The taxonomy is the server-side source of truth for minimum assurance levels, evidence requirements, expiry windows, allowed purposes/surfaces, reliance limits, operator-review requirements, and prohibited uses for high-impact claims.
- Unclassified, disabled, deprecated, stale-version, stale-hash, under-assured, expired, wrong-purpose, or wrong-surface claim classes fail closed.
- Activated taxonomy rows are append-only. Adding a claim class, lowering minimum assurance, widening purposes/surfaces, weakening evidence/review requirements, extending validity windows, weakening reliance limits, changing prohibited uses, or changing public labels requires a new taxonomy version/hash, safety or domain review where applicable, and explicit migration/re-confirmation for dependent claim-assurance records, active briefs, intro requests, disclosure grants, receipts, caches, and exports.
- CI and promotion tests must recompute the canonical claim-assurance taxonomy hash and compare the active taxonomy against claim-assurance validators, delegate-run scoring, opportunity-brief rendering, intro-request creation, disclosure-prompt rendering, reliance wording, docs, and public contracts. Same-version in-place mutation, stale docs, orphaned tests, partial taxonomy materialization, client-supplied taxonomy claims, or taxonomy-hash mismatches fail closed before promotion.

## `background_claim_assurance_records`

Use an existing verification / evidence-review table if present; otherwise add a compact table for high-impact claim assurance. This table is not a ranking surface and must not store raw evidence in ordinary application rows.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `claim_kind` | enum: `credential \| authority \| funding_capacity \| institutional_affiliation \| legal_expertise \| medical_expertise \| immigration_expertise \| fiscal_sponsorship \| scarce_resource \| safety_relevant_capability \| other_high_impact` |
| `broad_claim_key` | `text not null`; schema-bound broad claim key, not raw claim text |
| `assurance_level` | enum: `self_attested \| evidence_submitted \| operator_reviewed \| externally_verified \| expired \| revoked \| rejected` |
| `allowed_purpose_bindings` | `jsonb not null`; `{purpose_code, purpose_policy_version}` bindings for which the assurance may be used |
| `allowed_surface_keys` | `text[] not null` |
| `evidence_state` | enum: `none \| redacted_summary \| vault_bound_evidence \| external_verification_ref` |
| `redacted_evidence_summary` | `text nullable` |
| `review_state` | enum: `pending \| approved \| rejected \| stale \| revoked` |
| `assurance_version` | `text not null` |
| `claim_assurance_taxonomy_version_snapshot` | `text not null` |
| `claim_assurance_taxonomy_hash_snapshot` | `text not null`; canonical hash of the active claim-assurance taxonomy used for this assurance record |
| `confirmed_at` | `timestamptz nullable` |
| `expires_at` | `timestamptz not null` |
| `revoked_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Claim-assurance requirements:

- High-impact claims may appear as participant-owned drafts or low-assurance broad fields, but they must not create high-confidence opportunity briefs, intro advancement, reliance language, field-level disclosure, or positive score beyond low-assurance matching unless the current assurance record and the active claim-assurance taxonomy permit the selected purpose, surface, audience scope, and reliance use.
- Expired, rejected, revoked, stale, wrong-purpose, wrong-surface, under-assured, wrong-taxonomy-version/hash, or missing assurance records are hard blockers for high-impact claim influence.
- A claim-assurance record is valid only if its claim class, broad claim key, minimum assurance level, evidence state, allowed purpose bindings, allowed surfaces, expiry, and reliance limits remain compatible with the active content-addressed claim-assurance taxonomy. Taxonomy changes that broaden use, lower assurance requirements, or change reliance limits must mark dependent active artifacts stale unless participants explicitly re-confirm or the claim is re-verified under the new taxonomy.
- Claim-assurance records must snapshot the claim-assurance taxonomy version/hash used at confirmation/review time, and policy decisions must fail closed if that snapshot no longer matches the active taxonomy required for the attempted action.
- Evidence payloads should live in the vault or an existing sensitive evidence-review system; ordinary routes and telemetry may see only redacted assurance labels.
- Assurance labels exposed to requesters or counterparties must be generic and purpose-safe; do not expose exact evidence, reviewer notes, credential numbers, institutional private records, or verification failure reasons before the relevant disclosure stage.

## `background_power_asymmetry_reviews`

Use an existing safety-review / moderation-review table if present; otherwise add a compact table for dependency and power-asymmetry safeguards. This table is a safety gate, not a scoring feature.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `purpose_code` | `text not null` |
| `purpose_policy_version` | `text not null` |
| `relation_type` | enum: `funder_grantee \| employer_applicant \| landlord_tenant \| clinician_client \| legal_advisor_client \| immigration_advisor_client \| mentor_mentee \| platform_admin_user \| regulator_regulated_party \| other_high_asymmetry` |
| `review_state` | enum: `not_required \| pending \| approved_with_safeguards \| blocked \| expired \| revoked` |
| `safeguard_codes` | `text[] not null default '{}'`; e.g. `operator_review`, `neutral_consent_copy`, `no_urgency_boost`, `field_grant_limit`, `cooloff_required` |
| `requester_handle_id` | `uuid nullable`; run-scoped or policy-scoped handle only |
| `candidate_handle_id` | `uuid nullable`; run-scoped or policy-scoped handle only |
| `redacted_summary` | `text not null` |
| `expires_at` | `timestamptz not null` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Power-asymmetry requirements:

- Power-asymmetry reviews may be triggered only from explicit confirmed broad signals, claim-assurance classes, subject-identity records, participant safety preferences, named partner/collective grants, or operator review. They must not infer protected traits, psychology, ideology, or hidden vulnerabilities.
- Pending, blocked, expired, revoked, wrong-purpose, wrong-scope, or missing required reviews are hard blockers for opportunity creation, intro advancement, counterparty prompts, reminders, and field-level disclosure where the taxonomy or risk review requires a safeguard.
- Safeguards must be side-channel-safe: requesters and counterparties see only generic review/consent labels, not exact dependency, vulnerability, safety-preference, or reviewer reasoning.
- Power-asymmetry records must not be used for popularity ranking, reputation scoring, engagement optimization, advertising, payment priority, or broad deplatforming except through the separate safety/tripwire process.


## `background_pairwise_safety_preferences`

Use an existing block/mute/safety-preference table if present; otherwise add a compact table for private participant-controlled do-not-match, block, mute, or no-reminder preferences. This table is a hard-gate/safety surface, not a ranking feature.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `preference_kind` | enum: `do_not_match \| block \| mute \| no_reminders \| no_recontact` |
| `scope_kind` | enum: `profile \| organization \| cohort \| partner \| intro_request \| purpose_code \| global_background_networking` |
| `scope_value_internal` | `text not null`; service-side identifier or opaque reference, never requester-visible |
| `purpose_code` | `text nullable` |
| `purpose_policy_version` | `text nullable` |
| `state` | enum: `active \| paused \| revoked \| expired` |
| `reason_code` | `text nullable`; redacted safety reason category |
| `created_from_event_kind` | enum nullable: `manual \| dismissal \| report \| declined_intro \| post_consent_interaction \| operator_safety_action` |
| `expires_at` | `timestamptz nullable`; required for non-permanent mutes/cool-offs |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |
| `revoked_at` | `timestamptz nullable` |

Pairwise safety-preference requirements:

- Active preferences are hard blockers for in-scope matching, surfacing, notifications, feedback advancement, intro requests, reminders, and disclosure grants.
- Preferences must not be visible to counterparties, requesters, partner systems, exports, public docs, receipts, telemetry, or ordinary diagnostics. They map to generic requester/counterparty states such as `unavailable`, `privacy_or_consent_gate`, or `closed`.
- Preferences must not be used for popularity ranking, candidate reputation, engagement optimization, or broad deplatforming unless independently routed through the redacted safety/tripwire process.
- Revocation, expiry, creation, or scope change must invalidate dependent active briefs, intro requests, reminders, queued notifications, cached projections, and pending disclosure grants.


## `background_policy_action_kind_registry`

Use an existing permission/action-kind registry if present; otherwise add a compact governed typed-configuration bundle or table for all background-networking policy action kinds. This registry prevents broad or stale action names from becoming implicit authority. It is policy infrastructure, not a user-facing product surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `action_kind` | `text not null`; stable allowlisted action key, unique within `action_kind_registry_version` |
| `action_kind_registry_version` | `text not null` |
| `action_kind_registry_hash` | `text not null`; canonical content hash over the complete sorted registry for this version |
| `supersedes_action_kind_registry_version` | `text nullable`; previous registry version if this is a governed replacement |
| `action_family` | enum: `read_render | match_compute | artifact_state | notification | intro_flow | disclosure | operator_review | governance | partner_callback | export | telemetry | retention | vault_access | phase_gate` |
| `side_effect_class` | enum: `none | internal_state_change | quota_or_reservation | external_delivery | counterparty_prompt | partner_callback | exact_field_reveal | vault_decrypt | export_creation | telemetry_emit | retention_delete | governance_change` |
| `allowed_actor_roles` | `text[] not null`; actor roles that may request this action kind through the policy evaluator |
| `allowed_lane_kinds` | `text[] not null`; lane kinds where this action kind may appear |
| `requires_single_use_consumption` | `boolean not null default true` for every side-effecting action; may be false only when `side_effect_class = none` |
| `requires_idempotency_key` | `boolean not null default true` for every side-effecting or externally delivering action |
| `requires_output_schema_version` | `boolean not null default true` for requester/counterparty/partner/export/telemetry surfaces |
| `requires_step_up` | `boolean not null default false` |
| `requires_operator_or_governance_review` | `boolean not null default false` |
| `action_record_hash` | `text not null`; hash of this action-kind row's canonical policy fields |
| `status` | enum: `draft | active | deprecated | disabled` |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |
| `deprecated_at` | `timestamptz nullable` |

Policy-action-kind registry requirements:

- The active release/config manifest's `policy_action_kind_registry_version` and `policy_action_kind_registry_hash` must resolve to an active, complete, content-addressed action-kind registry. The policy evaluator may accept only active action kinds from that exact registry version/hash. Missing, disabled, deprecated, stale-version, stale-hash, wrong-phase, wrong-lane, or wrong-actor action kinds fail closed.
- Broad or ambiguous action kinds such as `other`, `misc`, `admin_action`, `background_operation`, `debug`, `manual_override`, `worker_task`, or `partner_action` are forbidden. A lane may not rely on string prefixes, free-form action names, or client/partner supplied action kinds.
- Every action that can enqueue work, mutate state, reserve or increment quota, create/stale/redact/anonymize artifacts, send/suppress notifications, advance feedback, create intros, prompt counterparties, approve operator review, reveal exact fields, decrypt or reveal vault data, call partners, generate exports, emit telemetry, run retention cleanup, activate/release emergency controls, approve governance changes, activate manifests, or broaden phase-gate bundles must have an explicit active registry action kind.
- Phase-gate bundle `allowed_action_kinds`, tool-capability `allowed_action_kinds`, policy-decision records, state-transition policies, admin safety actions, release-manifest tests, and route/worker registrations must all validate against the same action-kind registry.
- CI and promotion tests must recompute the canonical action-kind registry hash and compare the active action-kind registry against phase-gate bundle `allowed_action_kinds`, tool-capability records, state-transition policies, policy-decision fixtures, route/worker registrations, operator/admin action paths, export builders, telemetry builders, and documentation. Unregistered actions, stale docs, orphaned tests, same-version in-place mutations, registry-hash mismatches, or catch-all action paths fail closed before promotion.
- Activated action-kind registry rows are append-only. Adding a new side-effecting action kind, broadening allowed actor roles, changing a side-effect class, removing single-use/idempotency/output-schema/step-up/review requirements, changing permitted lane kinds, or changing action-family semantics requires a new `action_kind_registry_version`, new `action_kind_registry_hash`, and high-impact governance approval when it could expose ordinary users, candidates, counterparties, partners, exports, aggregate reports, vault fields, source summaries, intros, disclosure, federation, telemetry, or retention state.


## `background_output_schema_bundles`

Use an existing API-contract / output-schema registry if present; otherwise add a compact governed typed-configuration bundle or table for every requester-facing, counterparty-facing, participant-export, partner-facing, telemetry, cache, UI-hydration, and aggregate-report schema. This registry is the default-deny public-shape boundary for sanitized payloads; it is not generated from internal database rows.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `output_schema_bundle_version` | `text not null` |
| `output_schema_bundle_hash` | `text not null`; canonical content hash over the complete sorted output-schema registry for this version |
| `supersedes_output_schema_bundle_version` | `text nullable`; previous schema bundle if this is a governed replacement |
| `schema_key` | `text not null`; stable key for one output schema, unique within `output_schema_bundle_version` |
| `schema_surface` | enum: `requester_opportunity_brief | delegate_receipt | requester_diagnostic | requester_intro_status | counterparty_intro_prompt | disclosure_grant_status | participant_export | telemetry_event | cache_payload | ui_hydration_payload | partner_projection | aggregate_report | public_contract` |
| `audience_scope` | enum: `requester | candidate | counterparty | participant_owner | operator_redacted | partner_sanitized | public_aggregate | internal_service` |
| `allowed_keys` | `text[] not null default '{}'`; exact top-level keys allowed to leave the internal boundary |
| `forbidden_key_patterns` | `text[] not null default '{}'`; internal identifiers, debug keys, raw/exact fields, dependency snapshots, candidate gates, and timing-sensitive fields that must never serialize |
| `redaction_rules_hash` | `text not null`; hash of the redaction, bucketing, suppression, and rare-combination rules used by this schema |
| `extra_key_policy` | enum: `reject | strip_then_log_redacted | block_and_tripwire` |
| `allowed_action_kinds` | `text[] not null default '{}'` |
| `allowed_lane_kinds` | `text[] not null default '{}'` |
| `schema_record_hash` | `text not null`; hash of this schema row's canonical policy fields |
| `status` | enum: `draft | active | deprecated | disabled` |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |
| `deprecated_at` | `timestamptz nullable` |

Output-schema bundle requirements:

- The active release/config manifest's `output_schema_bundle_version` and `output_schema_bundle_hash` must resolve to an active, complete, content-addressed output-schema bundle. Render/send/export/cache/telemetry actions may emit only schemas from that exact version/hash.
- Output-schema bundles are default-deny. If a route, worker, renderer, cache builder, telemetry builder, export builder, partner callback, counterparty prompt, public contract, or UI hydration path lacks an active schema record for its exact action kind, lane, surface, and audience, the action fails closed.
- Activated schema rows are append-only. Adding a visible key, widening an audience or lane binding, weakening a redaction/bucketing/suppression rule, changing extra-key behavior, permitting a new action kind, or allowing a formerly forbidden key requires a new `output_schema_bundle_version`, new `output_schema_bundle_hash`, privacy review, and governed release/config activation.
- Output schemas must be authored as explicit allowlists and must not be inferred from ORM entities, internal table definitions, GraphQL selection sets, spread types, generated database schemas, debug serializers, or `select *` queries.
- CI and promotion tests must recompute the canonical output-schema bundle hash and compare every route serializer, receipt renderer, cache payload, export builder, telemetry event, partner projection, counterparty prompt, public contract, and UI hydration payload against the active schema bundle. Same-version in-place mutation, stale docs, orphaned tests, internal-row imports, extra keys, forbidden-key patterns, or schema-hash mismatch fail closed before promotion.
- Requester-facing and counterparty-facing payloads may include only the redacted `schema_key`/version where needed; they must not expose internal schema dependency maps, forbidden-key patterns, rare-combination internals, candidate-specific gate logic, or abuse heuristics.

## `background_policy_decision_records`

Use an existing authorization/policy-decision framework if present; otherwise add a compact internal table or append-only log for canonical background-networking policy verdicts. This is the single enforcement/audit surface for non-waivable gates; it is not requester-visible analytics.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `action_kind` | `text not null`; must reference an active `background_policy_action_kind_registry.action_kind` or repository-equivalent governed action-kind allowlist for the current `action_kind_registry_version` |
| `actor_id` | `uuid nullable` or repository-standard actor identifier |
| `actor_role` | enum: `participant \| candidate \| counterparty \| operator \| admin \| system \| partner_service` |
| `participant_id` | `uuid nullable`; redacted/null where the action is aggregate-only |
| `purpose_code` | `text nullable` |
| `purpose_policy_version` | `text nullable` |
| `purpose_registry_version` | `text nullable`; required when `purpose_code` or `purpose_policy_version` is present |
| `purpose_registry_hash` | `text nullable`; canonical content hash of the active purpose-code registry when a purpose-bound action is evaluated |
| `signal_taxonomy_version` | `text nullable`; required when the action evaluates, confirms, applies, or mutates matchable signals or signal-taxonomy-gated outputs |
| `signal_taxonomy_hash` | `text nullable`; canonical content hash of the active signal-taxonomy registry when signal-taxonomy-gated behavior is evaluated |
| `safety_blocker_taxonomy_version` | `text nullable`; required when the action evaluates prohibited-coordination, abuse, harmful-coordination, or safety-blocker behavior |
| `safety_blocker_taxonomy_hash` | `text nullable`; canonical content hash of the active safety-blocker taxonomy when safety-blocker-gated behavior is evaluated |
| `claim_assurance_taxonomy_version` | `text nullable`; required when the action evaluates, verifies, relies on, renders, or mutates high-impact claims or claim-assurance-gated outputs |
| `claim_assurance_taxonomy_hash` | `text nullable`; canonical content hash of the active claim-assurance taxonomy when claim-assurance-gated behavior is evaluated |
| `retention_policy_bundle_version` | `text nullable`; required when the action creates, retains, anonymizes, deletes, restores, exports, caches, or invalidates background-networking artifacts |
| `retention_policy_bundle_hash` | `text nullable`; canonical content hash of the active retention-policy bundle when retention-bound behavior is evaluated |
| `aggregate_release_policy_version` | `text nullable`; required when the action publishes, displays, exports, caches, or evaluates aggregate analytics, public metrics, partner reports, telemetry exports, measurement queries, or research extracts |
| `aggregate_release_policy_hash` | `text nullable`; canonical content hash of the active aggregate-release policy bundle when aggregate-release behavior is evaluated |
| `queue_freshness_control_version` | `text nullable`; required when the action enqueues, delays, retries, drains, sends, or cancels pending background-networking work |
| `queue_freshness_control_hash` | `text nullable`; canonical content hash of the active queue-freshness control bundle when pending-work behavior is evaluated |
| `policy_engine_version` | `text not null` |
| `action_kind_registry_version` | `text not null` |
| `action_kind_registry_hash` | `text not null`; canonical content hash of the active action-kind registry |
| `release_manifest_id` | `uuid not null` or stable manifest id |
| `governed_bundle_canonicalization_profile_version` | `text not null`; active canonicalization/materialization profile used to interpret governed bundle hashes |
| `governed_bundle_canonicalization_profile_hash` | `text not null`; canonical content hash of the active governed-bundle canonicalization profile |
| `policy_composition_bundle_version` | `text not null`; active composition-rule bundle used by the policy evaluator |
| `policy_composition_bundle_hash` | `text not null`; canonical content hash of the active policy-composition bundle |
| `artifact_transition_policy_bundle_version` | `text nullable`; required when the action changes an artifact state |
| `artifact_transition_policy_bundle_hash` | `text nullable`; canonical content hash of the active artifact-transition policy bundle when transition-bound behavior is evaluated |
| `artifact_dependency_policy_version` | `text nullable`; required when the action creates, renders, invalidates, or revalidates dependency-bound artifacts |
| `artifact_dependency_policy_hash` | `text nullable`; canonical content hash of the active artifact-dependency/stale-propagation policy |
| `background_networking_phase` | enum nullable: `phase_0_policy_skeleton \| phase_1_internal_staff_core \| phase_2_source_summary_intro_skeleton \| phase_3_tiny_cohort_partner_pilot \| phase_4_higher_power_lanes \| full_mature_system`; required for background-networking lane actions |
| `phase_gate_bundle_version` | `text nullable`; required for background-networking lane actions |
| `phase_gate_bundle_hash` | `text nullable`; canonical content hash of the active phase-gate bundle; required for background-networking lane actions |
| `phase_lane_key` | `text nullable`; stable lane key from the active phase-gate bundle |
| `output_schema_version` | `text nullable` |
| `output_schema_bundle_version` | `text nullable`; required for requester/counterparty/partner/export/cache/telemetry/public-contract surfaces |
| `output_schema_bundle_hash` | `text nullable`; canonical content hash of the active output-schema bundle |
| `ui_copy_bundle_version` | `text nullable`; required when the action renders or sends UI copy, consent copy, notification copy, receipt copy, unavailable-state copy, accessibility labels, or privacy-impact labels |
| `ui_copy_bundle_hash` | `text nullable`; canonical content hash of the active UI-copy bundle |
| `client_surface_integrity_policy_version` | `text nullable`; required when the action renders, hydrates, caches, or links to a Background Delegate client surface |
| `client_surface_integrity_policy_hash` | `text nullable`; canonical content hash of the active client-surface integrity policy bundle |
| `tool_capability_bundle_version` | `text nullable`; required for delegate/worker/tool-capability-executing actions |
| `tool_capability_bundle_hash` | `text nullable`; canonical content hash of the active tool-capability bundle |
| `external_processor_policy_version` | `text nullable`; required when an action sends payloads or metadata to an external processor or delivery provider |
| `external_processor_policy_hash` | `text nullable`; canonical content hash of the active external-processor policy bundle |
| `sensitive_audit_chain_policy_version` | `text nullable`; required for high-impact audit-chain-bound actions |
| `sensitive_audit_chain_policy_hash` | `text nullable`; canonical content hash of the active sensitive-audit-chain policy |
| `dependency_snapshot` | `jsonb not null`; redacted versions and pass/fail labels only |
| `verdict` | enum: `allow \| deny \| stale \| needs_review` |
| `redacted_reason_codes` | `text[] not null default '{}'` |
| `created_at` | `timestamptz` |
| `expires_at` | `timestamptz not null`; short-lived for render/send actions |
| `used_at` | `timestamptz nullable` |
| `consumption_state` | enum nullable: `unconsumed \| consumed \| expired \| invalidated`; required for side-effecting allow decisions |
| `action_idempotency_key` | `text nullable`; server-derived key binding the decision to one action attempt or idempotent action family |
| `consumed_by_execution_id` | `text nullable`; worker/route/job execution id that atomically consumed the decision |

Policy-decision requirements:

- Every route, worker, queue consumer, notification builder, cache renderer, export job, telemetry builder, operator approval path, and retention cleanup path must consume a fresh policy decision for the exact action kind it performs. A policy decision for one action kind must not authorize a different action kind.
- The governed-bundle canonicalization/materialization profile used to interpret every manifest-bound hash must be active in the release manifest's `governed_bundle_canonicalization_profile_version` and `governed_bundle_canonicalization_profile_hash`. The policy-composition rules used by the evaluator must be active records in the release manifest's `policy_composition_bundle_version` and `policy_composition_bundle_hash`. If the action changes an artifact state, the artifact-transition rule must be an active record in the release manifest's `artifact_transition_policy_bundle_version` and `artifact_transition_policy_bundle_hash`. If the action creates, renders, invalidates, or revalidates dependency-bound artifacts, the artifact-dependency policy must match the release manifest's `artifact_dependency_policy_version` and `artifact_dependency_policy_hash`. The action kind must be an active registry entry for the release manifest's `action_kind_registry_version` and `action_kind_registry_hash`, and for the active phase/lane. If the action is purpose-bound, the purpose code and purpose-policy version must be active records in the release manifest's `purpose_registry_version` and `purpose_registry_hash`. If the action evaluates, confirms, applies, scores, renders, or mutates matchable signals, the signal class must be an active record in the release manifest's `signal_taxonomy_version` and `signal_taxonomy_hash`. If the action evaluates prohibited coordination, abuse, harmful-coordination, or safety-blocker behavior, the blocker class must be an active record in the release manifest's `safety_blocker_taxonomy_version` and `safety_blocker_taxonomy_hash`. If the action evaluates, verifies, scores, relies on, renders, discloses, or mutates a high-impact claim, the claim class and minimum assurance rule must be active records in the release manifest's `claim_assurance_taxonomy_version` and `claim_assurance_taxonomy_hash`. If the action creates, retains, anonymizes, deletes, restores, exports, caches, or invalidates a background-networking artifact, the retention class and retained-field policy must be active records in the release manifest's `retention_policy_bundle_version` and `retention_policy_bundle_hash`. If the action publishes, displays, exports, caches, or evaluates aggregate analytics, public metrics, partner reports, telemetry exports, measurement queries, or research extracts, the query family, scope, minimum group size, differencing window, suppression/noise policy, review state, and expiry must be active records in the release manifest's `aggregate_release_policy_version` and `aggregate_release_policy_hash`. If the action enqueues, delays, retries, drains, sends, cancels, or suppresses pending work, the pending-work class must be active in the release manifest's `queue_freshness_control_version` and `queue_freshness_control_hash`. If the action sends payloads or metadata to an external processor or delivery provider, the processor record must be active in the release manifest's `external_processor_policy_version` and `external_processor_policy_hash`. If the action requires high-impact audit-chain logging, the audit family must be active in the release manifest's `sensitive_audit_chain_policy_version` and `sensitive_audit_chain_policy_hash`. Any emitted payload must use an active output schema from the release manifest's `output_schema_bundle_version` and `output_schema_bundle_hash`; any rendered or sent UI/consent/notification/receipt/unavailable-state/accessibility copy must use an active copy key from the release manifest's `ui_copy_bundle_version` and `ui_copy_bundle_hash`; any rendered, hydrated, cached, or linked Background Delegate client surface must satisfy the release manifest's `client_surface_integrity_policy_version` and `client_surface_integrity_policy_hash`; any invoked tool or worker capability must use an active capability record from the release manifest's `tool_capability_bundle_version` and `tool_capability_bundle_hash`. Unregistered, catch-all, broad fallback, disabled, deprecated, stale-hash, wrong-lane, wrong-actor, wrong-side-effect-class, wrong-purpose-registry, wrong-signal-taxonomy, wrong-safety-blocker-taxonomy, wrong-claim-assurance-taxonomy, wrong-retention-policy-bundle, wrong-aggregate-release-policy-bundle, wrong-queue-freshness-control, wrong-external-processor-policy, wrong-sensitive-audit-chain-policy, wrong-policy-composition-bundle, wrong-artifact-transition-policy-bundle, wrong-artifact-dependency-policy, wrong-output-schema-bundle, wrong-ui-copy-bundle, wrong-client-surface-integrity-policy, wrong-tool-capability-bundle, or client/partner/operator-supplied action kinds fail closed.
- For side-effecting or externally delivering actions, consuming a policy decision must be an atomic server-side check-and-set that verifies the decision is still `unconsumed`, unexpired, exact-action, exact-lane, exact-output-schema-version, exact-output-schema-bundle-hash, exact-tool-capability-bundle-hash where a capability is used, exact-manifest, exact-phase-gate-bundle-hash, exact-action-kind-registry-hash, exact-signal-taxonomy-hash where signal-taxonomy-gated behavior is used, exact-safety-blocker-taxonomy-hash where safety-blocker-gated behavior is used, exact-claim-assurance-taxonomy-hash where claim-assurance-gated behavior is used, exact-retention-policy-bundle-hash where retention-bound behavior is used, exact-aggregate-release-policy-hash where aggregate-release-bound behavior is used, exact-queue-freshness-control-hash where pending-work behavior is used, exact-governed-bundle-canonicalization-profile-hash, exact-client-surface-integrity-policy-hash where a client surface is rendered/hydrated/cached/linked, exact-policy-composition-bundle-hash, exact-artifact-transition-policy-bundle-hash where transition-bound behavior is used, exact-artifact-dependency-policy-hash where dependency-bound behavior is used, exact-external-processor-policy-hash where a processor is used, exact-sensitive-audit-chain-policy-hash where audit-chain-bound behavior is used, and dependency-current. Replayed decisions, already-consumed decisions, decisions with the wrong `action_idempotency_key`, or decisions consumed by a different execution context fail closed. Queue retries must either reuse the same idempotency key without creating duplicate side effects or request a new policy decision from currently valid inputs.
- For background-networking lane actions, the policy decision must also name the active `background_networking_phase`, `phase_gate_bundle_version`, `phase_gate_bundle_hash`, `phase_lane_key`, `action_kind_registry_version`, `action_kind_registry_hash`, `output_schema_bundle_version`, `output_schema_bundle_hash`, `ui_copy_bundle_version`, and `ui_copy_bundle_hash` where the action can emit a payload or render governed copy, and `tool_capability_bundle_version` and `tool_capability_bundle_hash` where the action can execute a registered capability. A decision for one lane, phase, phase-gate bundle version/hash, policy-composition bundle version/hash, artifact-transition policy bundle version/hash, artifact-dependency policy version/hash, action-kind registry version/hash, purpose-registry version/hash, signal-taxonomy version/hash, safety-blocker taxonomy version/hash, claim-assurance taxonomy version/hash, retention-policy bundle version/hash, aggregate-release policy bundle version/hash, queue-freshness control version/hash, external-processor policy version/hash, sensitive-audit-chain policy version/hash, UI-copy bundle version/hash, client-surface integrity policy version/hash, governed-bundle canonicalization profile version/hash, or output-schema bundle version/hash must not authorize another lane, later phase, disabled stub, future-phase route, worker, UI path, export path, telemetry path, partner callback, source-summary path, intro path, disclosure path, vault path, aggregate-report path, federation path, action-kind semantics, purpose semantics, signal-taxonomy semantics, claim-assurance semantics, policy-composition semantics, artifact-transition semantics, retention semantics, output-schema semantics, or tool-capability semantics.
- Policy decisions are server-generated only. Clients, partners, operators, feature flags, fixtures, and tests must not be able to manufacture allow verdicts.
- A decision must fail closed if any dependency version, output schema version, output-schema bundle hash, UI-copy bundle hash, client-surface integrity policy hash, governed-bundle canonicalization profile hash, tool-capability bundle hash, purpose-code version, purpose-registry hash, signal-taxonomy hash, safety-blocker taxonomy hash, claim-assurance taxonomy hash, retention-policy bundle hash, aggregate-release policy bundle hash, queue-freshness control hash, policy-composition bundle hash, artifact-transition policy bundle hash, artifact-dependency policy hash, external-processor policy hash, sensitive-audit-chain policy hash, authorization, candidate exposure, disclosure grant, safety preference, emergency control, tripwire, retention hold, or vault key state has changed since the decision was created.
- Requester-facing payloads may include only a redacted policy-decision id or generic gate label where useful; they must not include internal dependency snapshots, candidate-specific blocker reasons, abuse heuristics, or operator notes.
- Policy-decision logs must be retention-bound and redacted. They may support safety review and invariant testing, but must not become analytics features, ranking signals, or public reports.

## `background_artifact_dependency_edges`

Use an existing dependency / invalidation graph if present; otherwise add a compact internal table for dynamic dependency edges between active Background Delegate artifacts and the consent, policy, safety, source, and retention records they rely on. This table is a stale-propagation and correctness surface; it is not requester-visible analytics.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `artifact_kind` | enum: `delegate_run | opportunity_brief | opportunity_feedback | intro_request | disclosure_grant | receipt | screen_state | effective_permission_preview | outbox_row | export | cache_payload | partner_payload | federation_payload | mediated_contact_session | audit_chain_event` |
| `artifact_id` | `uuid not null` or repository-standard opaque artifact id |
| `participant_id` | `uuid nullable`; redacted/null where aggregate-only |
| `dependency_kind` | enum: `release_manifest | governed_bundle_hash | delegate_authorization | wish_profile | source_summary | tag_confirmation | match_signal_lineage | candidate_exposure | candidate_budget | subject_identity | entity_resolution | partner_grant | federation_grant | disclosure_grant | pairwise_safety_preference | privacy_freeze | retention_hold | emergency_control | runtime_tripwire | external_processor_policy | mediated_contact_policy` |
| `dependency_ref` | `text not null`; internal opaque reference or version/hash, never a requester-visible identifier |
| `dependency_version_snapshot` | `text nullable` |
| `dependency_hash_snapshot` | `text nullable` |
| `edge_state` | enum: `active | stale | invalidated | redacted | anonymized` |
| `artifact_dependency_policy_version` | `text not null` |
| `artifact_dependency_policy_hash` | `text not null` |
| `stale_propagation_state` | enum: `not_needed | queued | processing | completed | failed` |
| `retention_expires_at` | `timestamptz not null` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Artifact-dependency requirements:

- Any active artifact that can render, notify, export, advance an intro, disclose fields, call a processor/partner, or remain actionable must have dependency edges covering the current inputs needed to decide whether it is still valid.
- Dependency edges may store only internal opaque references, versions, hashes, and redacted state labels. They must not store raw source text, exact wishes, exact contact details, candidate/counterparty identifiers in requester-readable form, message content, hidden abuse heuristics, or exact blocker reasons.
- Revocation, correction, expiry, manifest/bundle replacement, retention cleanup, privacy freeze, emergency control, tripwire, subject-identity change, entity-resolution change, candidate-exposure/budget change, or disclosure-grant change must mark affected edges stale and enqueue stale propagation before any dependent side effect can run.
- Missing edges, failed edge materialization, stale edge policy, stale-propagation failure, or an artifact with active side effects but no dependency edges fails closed until recomputed from current inputs.
- Retention cleanup must redact or anonymize dependency edges with their parent artifact and must not preserve a linkable dependency graph longer than the active retention policy permits.

## `background_policy_composition_rules`

Use an existing authorization-composition framework if present; otherwise add a compact governed typed-config bundle or table that defines how overlapping background-networking controls combine. This is policy infrastructure, not a user-facing product surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `rule_code` | `text not null` |
| `policy_composition_bundle_version` | `text not null`; content-addressed bundle version containing this composition rule |
| `policy_composition_bundle_hash` | `text not null`; canonical content hash over the complete sorted policy-composition bundle for this version |
| `supersedes_policy_composition_bundle_version` | `text nullable`; previous composition bundle if this is a governed replacement |
| `status` | enum: `draft \| active \| deprecated \| disabled` |
| `applies_to_action_kinds` | `text[] not null` |
| `control_families` | `text[] not null`; e.g. authorization, candidate exposure, disclosure grant, safety preference, privacy freeze, retention hold, emergency control, tripwire, partner/federation grant, output schema, vault policy |
| `composition_mode` | enum: `intersection \| deny_overrides \| narrowest_scope_wins \| explicit_registry_exception_only` |
| `conflict_behavior` | enum: `fail_closed \| require_recompute \| require_operator_review` |
| `rule_record_hash` | `text not null`; hash of this composition-rule row's canonical policy fields |
| `version` | `text not null`; rule-local version or repository-standard policy version |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |

Policy-composition requirements:

- The active release/config manifest's `policy_composition_bundle_version` and `policy_composition_bundle_hash` must resolve to an active, complete, content-addressed composition-rule bundle. The canonical policy evaluator must apply rules from that exact bundle before producing an allow verdict. Broad allows never override narrower active denials, pauses, expiries, holds, freezes, missing bindings, or version mismatches.
- If two controls disagree and no active composition rule from the active bundle resolves the conflict, the action fails closed or becomes `needs_review` without surfacing, notifying, disclosing, exporting, or creating an actionable artifact.
- Any exception to least-permissive composition must be explicit, versioned, risk-reviewed, documented, content-addressed, and non-waivable by operators, feature flags, fixtures, migrations, rollbacks, partner callbacks, or cached policy decisions.
- Activated composition-rule rows are append-only. Adding a non-waiver exception, broadening a composition mode, weakening deny-overrides, weakening conflict behavior, changing control-family applicability, or making a denial weaker requires a new `policy_composition_bundle_version`, new `policy_composition_bundle_hash`, and high-impact governance approval when it could expose ordinary users, candidates, counterparties, partners, exports, aggregate reports, vault fields, source summaries, intros, disclosure, federation, telemetry, retention state, or safety controls.
- CI and promotion tests must recompute the canonical policy-composition bundle hash and compare the active composition rules against policy-evaluator code, policy-decision fixtures, state-transition policies, route/worker registrations, admin action paths, rollback paths, partner callbacks, docs, and public contracts. Same-version in-place mutation, stale docs, orphaned tests, partial bundle materialization, client-supplied composition claims, or composition-hash mismatches fail closed before promotion.

## `background_artifact_state_transition_policies`

Use an existing workflow/state-machine framework if present; otherwise add a governed transition-policy table or typed configuration bundle for every stateful background-networking artifact. This prevents accidental resurrection of stale, closed, redacted, anonymized, or revoked artifacts.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `artifact_kind` | enum: `delegate_authorization \| wish_profile \| source_summary \| delegate_run \| opportunity_brief \| opportunity_feedback \| intro_request \| disclosure_grant \| receipt \| privacy_freeze \| retention_hold \| emergency_control \| runtime_tripwire \| data_export \| partner_grant \| federation_grant \| aggregate_release \| policy_decision` |
| `artifact_transition_policy_bundle_version` | `text not null`; content-addressed bundle version containing this transition policy |
| `artifact_transition_policy_bundle_hash` | `text not null`; canonical content hash over the complete sorted artifact-transition policy bundle for this version |
| `supersedes_artifact_transition_policy_bundle_version` | `text nullable`; previous transition bundle if this is a governed replacement |
| `from_state` | `text not null` |
| `to_state` | `text not null` |
| `transition_code` | `text not null` |
| `required_policy_action_kind` | `text not null` |
| `allowed_actor_roles` | `text[] not null` |
| `required_preconditions` | `jsonb not null`; redacted version/gate labels only |
| `side_effects` | `jsonb not null`; e.g. stale dependents, cancel outbox, release reservations, enqueue retention cleanup |
| `receipt_or_audit_requirement` | enum: `none \| redacted_receipt \| internal_audit \| both` |
| `resurrection_allowed` | `boolean not null default false` |
| `status` | enum: `draft \| active \| deprecated \| disabled` |
| `transition_record_hash` | `text not null`; hash of this transition-policy row's canonical policy fields |
| `version` | `text not null`; transition-local version or repository-standard workflow version |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |

Artifact-transition requirements:

- The active release/config manifest's `artifact_transition_policy_bundle_version` and `artifact_transition_policy_bundle_hash` must resolve to an active, complete, content-addressed transition-policy bundle. All state transitions must pass through a transition function that validates the current stored state, requested target state, policy-decision action kind, actor role, release manifest, active transition-policy bundle version/hash, and required preconditions atomically.
- Unknown, skipped, stale-source, client-supplied, reverse, cross-artifact-inconsistent, disabled, stale-hash, or wrong-bundle transitions fail closed.
- Transitions that would make an artifact actionable after it was stale, closed, expired, redacted, anonymized, revoked, declined, deleted, frozen, or released are forbidden unless the active transition-policy bundle explicitly creates a new artifact from currently valid inputs rather than reactivating the old artifact.
- State transitions must perform their side effects atomically or through idempotent short-lived jobs: cancelling queued work, suppressing notifications, releasing budget reservations, marking dependents stale, invalidating caches/exports, updating receipts, and scheduling retention cleanup.
- Activated transition-policy rows are append-only. Adding a transition, adding a resurrection path, broadening actor roles, reducing preconditions, weakening non-actionability guarantees, removing required receipts/audit rows, removing side effects, or weakening stale/cache/outbox/retention behavior requires a new `artifact_transition_policy_bundle_version`, new `artifact_transition_policy_bundle_hash`, and high-impact governance approval when it could expose ordinary users, candidates, counterparties, partners, exports, aggregate reports, vault fields, source summaries, intros, disclosure, federation, telemetry, retention state, or safety controls.
- CI and promotion tests must recompute the canonical artifact-transition policy bundle hash and compare the active transition policies against transition functions, stateful artifact models, policy-action-kind registry entries, policy-decision fixtures, route/worker/admin paths, migrations, rollback/restore jobs, retention cleanup jobs, docs, and public contracts. Same-version in-place mutation, stale docs, orphaned tests, partial bundle materialization, client-supplied transition claims, or transition-bundle hash mismatches fail closed before promotion.

## `background_delegate_tool_capabilities`

Use an existing capability registry / worker-permission system if present; otherwise add a compact content-addressed governed registry for tools available to background-networking delegates, workers, LLM proposal paths, notification builders, retention jobs, vault paths, and partner services. This is a least-privilege execution boundary, not a product surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `tool_capability_bundle_version` | `text not null` |
| `tool_capability_bundle_hash` | `text not null`; canonical content hash over the complete sorted tool-capability registry for this version |
| `supersedes_tool_capability_bundle_version` | `text nullable`; previous tool-capability bundle if this is a governed replacement |
| `tool_key` | `text not null`; stable tool or integration identifier |
| `capability_class` | enum: `read_broad_profile \| read_confirmed_signal \| create_redacted_artifact \| render_sanitized_payload \| enqueue_notification \| retention_cleanup \| llm_field_proposal \| partner_service_callback` |
| `allowed_action_kinds` | `text[] not null`; exact policy-decision action kinds allowed to use this tool |
| `side_effect_class` | enum: `none \| internal_state_narrowing \| sanitized_notification \| retention_delete \| partner_callback` |
| `network_access` | enum: `none \| repository_internal \| allowlisted_partner_endpoint`; default `none` |
| `write_access_allowed` | `boolean not null default false` |
| `vault_decrypt_allowed` | `boolean not null default false` |
| `max_input_data_class` | enum: `public \| participant_visible_broad \| redacted_internal \| vault_exact_minimum` |
| `tool_capability_record_hash` | `text not null`; hash of this capability row's canonical policy fields |
| `status` | enum: `draft \| active \| disabled \| deprecated` |
| `risk_review_id` | `uuid nullable`; required for partner callbacks, network access, LLM proposal paths, vault-minimum data, or write-capable tools |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Delegate tool-capability requirements:

- The active release/config manifest's `tool_capability_bundle_version` and `tool_capability_bundle_hash` must resolve to an active, complete, content-addressed tool-capability bundle. Delegate runs and workers must execute with a per-run capability manifest derived from that exact bundle and the current policy decision. Missing, stale, disabled, wrong-action, wrong-purpose, wrong-risk-review, wrong-bundle-version, or wrong-bundle-hash capabilities fail closed.
- Default capability is no outbound network, no arbitrary fetch/browse, no code execution over imported content, no contact/email/calendar writes, no payment actions, no raw source access, and no vault decrypt.
- LLM or ML helpers may receive only the minimum text needed for a proposal and must not receive a general tool-use loop, browsing powers, source-export corpora, contact lists, or partner API access.
- Any tool that can create notifications, mutate state, call a partner system, delete records, export data, emit telemetry, or access vault-minimum data must be feature-flagged, policy-gated, logged, bound to the active tool-capability bundle hash, and covered by invariant tests.
- CI and promotion tests must recompute the canonical tool-capability bundle hash and compare the active capability registry against worker registrations, route handlers, queue consumers, LLM proposal paths, partner callbacks, vault paths, notification builders, retention jobs, phase-gate allowed action kinds, policy-decision fixtures, and documentation. Unregistered tools, stale docs, orphaned tests, same-version in-place mutations, capability-hash mismatches, or reachable tool paths outside the active bundle fail closed before promotion.
- Activated tool-capability rows are append-only. Adding a tool, broadening allowed action kinds, enabling outbound network access, enabling write access, enabling vault decrypt, raising `max_input_data_class`, weakening risk-review requirements, changing side-effect class, or permitting a new lane/tool family requires a new `tool_capability_bundle_version`, new `tool_capability_bundle_hash`, and high-impact governance approval when it could expose ordinary users, candidates, counterparties, partners, exports, aggregate reports, vault fields, source summaries, intros, disclosure, federation, telemetry, or retention state.
- Tool execution logs must be redacted, retention-bound, and must not include raw prompts, source text, exact wishes, contact details, candidate identifiers, private cohort membership, or hidden abuse heuristics.

## `background_private_data_vault_artifacts`

Use the repository's existing encrypted sensitive-field store if present; otherwise add a vault metadata table for raw/exact background-networking materials. This table tracks encrypted source and exact-field payloads while keeping matching and ordinary UI paths on confirmed broad signals only.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `artifact_kind` | enum: `raw_source_payload \| exact_source_summary \| exact_wish_field \| contact_field \| private_constraint \| disclosure_granted_field \| operator_reveal_payload` |
| `ciphertext_ref` | `text not null` or repository-standard encrypted blob reference |
| `key_scope` | enum: `participant_local \| participant_server_envelope \| field_grant \| operator_reveal \| legal_hold_minimum` |
| `key_version` | `text not null` |
| `purpose_code` | `text nullable` |
| `purpose_policy_version` | `text nullable` |
| `field_key` | `text nullable` |
| `source_summary_id` | `uuid nullable` |
| `disclosure_grant_id` | `uuid nullable` |
| `state` | enum: `active \| revoked \| stale \| redacted \| anonymized \| deleted` |
| `retention_expires_at` | `timestamptz not null` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Vault-boundary requirements:

- Matching, scoring, anti-probing, notifications, opportunity briefs, intro requests, telemetry, analytics, and public reports must not decrypt vault artifacts. They may use only explicitly confirmed broad fields/tags and redacted policy outputs.
- Decryption is allowed only for participant-owned review, explicitly granted post-mutual-consent field disclosure, role-authorized operator just-in-time reveal, or scoped legal/safety review. Each decrypt path requires a fresh policy decision, a reason code, field keys, expiry, and redacted audit entry.
- Vault artifacts must not be bulk-exportable, searchable by operators, copied to non-production, sent to LLM/model evals, or embedded in logs, screenshots, telemetry, cache entries, or UI hydration payloads.
- Revocation, expiry, grant narrowing, key rotation, or deletion must mark dependent broad proposals, source summaries, active briefs, intro requests, queued notifications, cached projections, and exports stale or purge them before render/send/download.

## `background_aggregate_release_controls`

Use an existing analytics governance/release-control system if present; otherwise add a compact content-addressed governed table or typed configuration bundle for aggregate background-networking metrics and public/partner reporting. This table governs aggregate releases only; it is not a matching or user-facing disclosure surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `aggregate_release_policy_version` | `text not null`; content-addressed bundle version containing this aggregate-release control |
| `aggregate_release_policy_hash` | `text not null`; canonical content hash over the complete sorted aggregate-release policy bundle for this version |
| `supersedes_aggregate_release_policy_version` | `text nullable`; previous aggregate-release policy bundle if this is a governed replacement |
| `release_kind` | enum: `internal_dashboard \| partner_report \| public_report \| telemetry_export \| measurement_query \| research_extract` |
| `query_family` | `text not null` |
| `scope_kind` | enum: `global \| purpose_code \| purpose_policy_version \| cohort \| partner \| surface \| audience_scope` |
| `scope_value` | `text nullable`; null only for global releases |
| `minimum_group_size` | `integer not null` |
| `differencing_window` | `interval not null` or repository-standard duration |
| `noise_or_suppression_policy` | enum: `suppress_sparse \| bucket_only \| add_noise \| redacted_review_only` |
| `review_state` | enum: `draft \| approved \| expired \| revoked \| blocked` |
| `approved_by` | `text nullable` |
| `expires_at` | `timestamptz not null` |
| `aggregate_release_record_hash` | `text not null`; hash of this aggregate-release control row's canonical policy fields |
| `status` | enum: `draft \| active \| deprecated \| disabled` |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |
| `updated_at` | `timestamptz` |

Aggregate-release requirements:

- The active release/config manifest's `aggregate_release_policy_version` and `aggregate_release_policy_hash` must resolve to an active, complete, content-addressed aggregate-release policy bundle before aggregate analytics, partner reports, public dashboards, research extracts, telemetry exports, or metric exports can be published, displayed, exported, cached, scheduled, or broadly internally displayed.
- Aggregate analytics, partner reports, public dashboards, research extracts, and metric exports must pass this release-control layer before publication, export, or broad internal display.
- Releases must suppress or noise sparse cohorts, candidate-specific gate categories, timing-sensitive metrics, budget states, exact blocker counts, and repeated deltas that could reconstruct individual candidate existence or private gate outcomes.
- Analysts must not run ad-hoc queries over internal background-networking rows, candidate identifiers, exact blocker states, exact timing, internal dependency snapshots, vault artifacts, or operator-reveal logs outside an approved incident/legal process.
- Activated aggregate-release rows are append-only. Adding a query family, lowering minimum group size, widening scope, weakening suppression/noise/differencing, extending expiry, weakening review requirements, changing released metric semantics, or weakening revocation invalidation requires a new `aggregate_release_policy_version`, new `aggregate_release_policy_hash`, privacy review where applicable, and governed release/config activation.
- Release configurations are time-bounded, content-addressed, audited, and revocable; revocation must invalidate dependent dashboards, exports, scheduled reports, cached aggregate payloads, policy decisions, and partner reports.
- CI and promotion tests must recompute the canonical aggregate-release policy hash and compare the active aggregate-release controls against analytics query families, dashboard builders, partner/public report builders, telemetry exporters, research-extract jobs, policy-decision fixtures, docs, and public contracts. Same-version in-place mutation, stale docs, orphaned tests, partial bundle materialization, client/analyst/partner-supplied aggregate-release claims, or aggregate-release-hash mismatches fail closed before promotion.

## `background_purpose_code_registry`

Use an existing policy/config registry if present; otherwise add a first-class content-addressed registry table or typed configuration bundle that is loaded server-side and covered by tests. This registry is the source of truth for purpose-code semantics, allowed surfaces, prohibited uses, risk tiers, and re-confirmation behavior.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` if stored in DB, or stable typed-config id |
| `purpose_code` | `text not null`; allowlisted stable code such as `moral_trade_offer`, `donation_offset`, `pledge_swap`, `moral_public_good`, `research_collaboration`, or `community_intro` |
| `purpose_policy_version` | `text not null`; immutable semantic version for the registry entry |
| `purpose_registry_version` | `text not null`; content-addressed registry bundle version containing this purpose entry |
| `purpose_registry_hash` | `text not null`; canonical content hash over the complete sorted purpose-code registry for this registry version |
| `supersedes_purpose_registry_version` | `text nullable`; previous registry version if this is a governed replacement |
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
| `purpose_record_hash` | `text not null`; hash of this purpose row's canonical semantic and policy fields |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |
| `deprecated_at` | `timestamptz nullable` |

Purpose registry requirements:

- The active release/config manifest's `purpose_registry_version` and `purpose_registry_hash` must resolve to an active, complete, content-addressed purpose-code registry. Delegate authorization, candidate exposure, delegate-run, opportunity-brief, receipt, intro-request, documentation, and test validation must use that exact registry version/hash.
- Active registry entries are append-only for semantic fields. Do not edit `stable_label`, `canonical_summary`, `allowed_surface_keys`, `prohibited_use_codes`, `risk_tier`, `requires_operator_review`, or `requires_reconfirmation_on_change` in place after activation. Use a new `purpose_registry_version`/`purpose_registry_hash` and, where semantics change for a specific purpose, a new `purpose_policy_version` or a new `purpose_code`.
- User-created purpose codes are forbidden. Free-text purpose descriptions may explain intent to the user, but they are not executable policy and must not widen the registry meaning.
- Deprecated, superseded, disabled, missing, wrong-registry-hash, or materially changed registry entries must fail closed for new runs and mark dependent active briefs stale unless the relevant participants explicitly re-confirm under the new registry version/hash and purpose-policy version.
- Registry labels and summaries shown in UI, receipts, docs, and API responses must be generated from the same active registry version/hash to prevent semantic drift.
- CI and promotion tests must recompute the canonical purpose-registry hash and compare the active registry against authorization validators, candidate-exposure validators, delegate-run creation, opportunity-brief rendering, receipt rendering, intro-request creation, docs, public contracts, and purpose-code UI. Same-version in-place mutation, stale docs, orphaned tests, partial registry materialization, client-supplied registry claims, or registry-hash mismatches fail closed before promotion.

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




## `background_pilot_evaluation_reviews`

Use an existing experimentation / launch-review table if present; otherwise add a compact table for pre-registered lane evaluation, shadow/canary promotion, sunset, and independent adversarial audit linkage. This table is not a matching surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `lane_kind` | enum: `internal_staff \| tiny_cohort \| partner_matchmaker \| federation_bridge \| high_sensitivity_lane \| broader_cohort \| public_broad_preview` |
| `purpose_code` | `text not null` |
| `purpose_policy_version` | `text not null` |
| `allowed_surface_keys` | `text[] not null` |
| `audience_scope` | enum: `internal_staff \| cohort_only \| partner_matchmaker \| public_broad_preview` |
| `cohort_scope_id` | `text nullable` |
| `partner_grant_id` | `uuid nullable` |
| `federation_grant_id` | `uuid nullable` |
| `evaluation_state` | enum: `draft \| shadow \| canary \| approved_to_promote \| sunset_required \| rolled_back \| expired \| blocked` |
| `ordinary_user_exposure_allowed` | `boolean not null default false` |
| `success_metric_config` | `jsonb not null`; redacted pre-registered utility/safety thresholds |
| `harm_metric_config` | `jsonb not null`; redacted pre-registered privacy, burden, false-match, report, overrule, abuse, and latency thresholds |
| `adversarial_safety_case_state` | enum: `not_required \| required \| passed \| failed \| expired \| blocked` |
| `independent_reviewer_ref` | `text nullable`; redacted reviewer/team reference |
| `redacted_safety_case_summary` | `text nullable` |
| `pilot_window_start` | `timestamptz nullable` |
| `pilot_window_end` | `timestamptz not null` |
| `sunset_or_rollback_rule` | `text not null`; redacted rule for failed or inconclusive pilots |
| `approved_by` | `text nullable` |
| `approved_at` | `timestamptz nullable` |
| `expires_at` | `timestamptz not null` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Pilot-evaluation requirements:

- Any external-pilot, partner, federation, broader-cohort, high-sensitivity, high-impact-claim, or public-broad-preview lane must reference a current evaluation record that exactly covers the purpose code, purpose-policy version, surfaces, audience/cohort scope, partner/federation grant where applicable, notification path, retention class, and output schemas.
- Shadow or canary mode must not create ordinary-user-facing opportunity briefs, candidate-facing exposure, notifications, intro requests, disclosure grants, exports, or requester-visible diagnostics unless those actions are explicitly inside the staff/test scope and pass all ordinary hard gates.
- Promotion is allowed only when the evaluation record is current, in `approved_to_promote`, has no failed pre-registered harm threshold, and any required adversarial safety-case / independent audit is passed and current.
- Failed, blocked, inconclusive, stale, wrong-scope, missing-baseline, or expired evaluation records trigger the configured sunset/rollback rule and must not silently continue as partial launch.
- Evaluation metrics must be aggregate, redacted, and privacy-budgeted. They may support promotion/sunset decisions but must not become person ranking, profile enrichment, candidate reputation, engagement optimization, or payment/partner-priority boosting.

## `background_partner_matchmaker_grants`

Use an existing partner-access / workflow-grant table if present; otherwise add a compact grant table for named partner-matchmaker access. This table authorizes a partner workflow; it is not a registry search surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `partner_id` | `uuid not null` or repository-standard partner identifier |
| `grant_state` | enum: `draft \| active \| paused \| revoked \| expired` |
| `purpose_code` | `text not null` |
| `purpose_policy_version` | `text not null` |
| `allowed_surface_keys` | `text[] not null` |
| `audience_scope` | enum: `cohort_only \| partner_matchmaker` |
| `allowed_cohort_ids` | `text[] not null default '{}'` |
| `allowed_operator_ids` | `uuid[] not null default '{}'` or repository-standard partner/operator identifiers |
| `max_runs_per_week` | `integer not null` |
| `max_briefs_per_week` | `integer not null` |
| `max_candidates_per_run` | `integer not null` |
| `sanitized_output_schema_version` | `text not null` |
| `risk_review_id` | `uuid not null` for non-staff or external-pilot use |
| `expires_at` | `timestamptz not null` |
| `revoked_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Partner-matchmaker grant requirements:

- Partner-matchmaker use must be named and grant-bound. A generic `partner_matchmaker` audience scope is not enough to authorize search, surfacing, notification, diagnostics, or intro advancement.
- The grant must validate against the purpose-code registry, the current approved risk review, the candidate's inbound partner exposure settings, the requester authorization, and scoped emergency controls/tripwires.
- Partner systems and partner staff may receive only sanitized projections/DTOs using requester-safe allowlist and extra-key rejection rules. They must not receive raw registry rows, internal opportunity-brief rows, candidate identifiers, candidate-dependency snapshots, exact blocker states, exact timing fields, candidate budget state, or private cohort membership.
- Revoked, expired, paused, missing, wrong-purpose, wrong-version, wrong-cohort, wrong-surface, wrong-partner, or over-quota grants fail closed before run creation, scoring, opportunity-brief creation, notification, feedback advancement, or intro-request creation.


## `background_federation_bridge_grants`

Use an existing integration-grants table if present; otherwise add a compact table for cross-platform or cross-instance background-networking bridges. Federation is not a launch requirement and must remain default-off.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `bridge_name` | `text not null` |
| `status` | enum: `draft \| active \| paused \| revoked \| expired \| blocked` |
| `purpose_code` | `text not null` |
| `purpose_policy_version` | `text not null` |
| `allowed_surface_keys` | `text[] not null` |
| `allowed_schema_versions` | `text[] not null` |
| `audience_scope` | enum: `cohort_only \| partner_matchmaker \| public_broad_preview` |
| `counterparty_system_ref` | `text not null`; redacted external system identifier |
| `data_direction` | enum: `inbound_only \| outbound_only \| bidirectional_redacted` |
| `raw_export_allowed` | `boolean not null default false` |
| `candidate_identifier_export_allowed` | `boolean not null default false` |
| `risk_review_id` | `uuid not null` |
| `pilot_evaluation_id` | `uuid not null` for non-staff use |
| `aggregate_release_control_id` | `uuid nullable` |
| `expires_at` | `timestamptz not null` |
| `revoked_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Federation requirements:

- Federation, external search, and cross-platform bridge paths are disabled unless a named active grant, current risk review, current pilot-evaluation record, purpose/version compatibility, schema compatibility, and policy decision all pass.
- Bridges may exchange only minimum-necessary, sanitized, versioned broad fields and aggregate-safe status labels. Raw source text, exact wishes, active candidate identifiers, internal rows, dependency snapshots, exact blocker states, exact timing, and reusable candidate-specific profile exports are forbidden by default.
- Revocation, expiry, emergency stops, purpose-policy changes, aggregate-release failures, or schema changes must stale dependent bridge payloads, caches, exports, receipts, and policy decisions.

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

- Operator/admin actions must not create or widen participant authorization, candidate exposure, purpose-code scope, allowed surfaces, audience scope, federation scope, or disclosure fields.
- Operators, reviewers, partner seats, and admins must pass conflict-of-interest checks where configured before high-impact review, intro approval, field reveal, partner/federation grant approval, risk-review approval, aggregate release, or emergency-control release. Conflicted actors must recuse or use an independent reviewer path; self-approval is invalid.
- Operator/admin actions must not mark stale artifacts valid, reverse anonymization, repopulate cleared candidate/counterparty identifiers, bypass minimum-pool checks, bypass risk-review requirements, or make hidden embeddings/latent features usable.
- `approve_intro_review` may only approve the next consent step when all non-waivable gates already pass; it must not itself disclose contact details or exact wishes.
- Break-glass actions are limited to abuse prevention, containment, suppression, quarantine, revocation, or retention holds/releases. They must not surface new candidates, send candidate-facing notices, reveal private fields, or advance stale artifacts.
- Admin safety actions must be redacted, RLS/service-role protected, and covered by audit tests. Public or participant-facing summaries may show only coarse action labels and redacted reasons.

## `background_sensitive_audit_chain_events`

Use an existing tamper-evident audit / WORM logging system if present; otherwise add a compact append-only event table for high-impact Background Delegate governance, reveal, processor, retention, and disclosure actions. This table supports integrity review; it is not user-facing analytics and must not store raw sensitive payloads.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or monotonic event id |
| `event_family` | enum: `manifest_activation | governed_bundle_activation | emergency_control_release | risk_or_pilot_approval | partner_or_federation_activation | external_processor_activation | production_sensitive_data_exception | retention_or_legal_hold | operator_field_reveal | vault_decrypt_or_reveal | exact_disclosure_grant | mediated_contact_escalation | break_glass_safety_action` |
| `target_kind` | `text not null` |
| `target_id` | `text not null`; internal opaque reference |
| `actor_id` | `text nullable`; redacted/system actor where needed |
| `policy_decision_id` | `uuid nullable` |
| `release_manifest_id` | `uuid nullable` or stable manifest id |
| `bundle_hash_snapshots` | `jsonb not null default '{}'`; governed bundle hashes relevant to the event |
| `redacted_reason_codes` | `text[] not null default '{}'` |
| `prior_event_hash` | `text nullable`; null only for the genesis event of a chain or repository-standard partition |
| `event_hash` | `text not null`; hash over canonical redacted event fields and prior hash |
| `verification_state` | enum: `pending | verified | failed | redacted_under_policy` |
| `retention_expires_at` | `timestamptz not null` |
| `created_at` | `timestamptz` |

Sensitive-audit-chain requirements:

- Required high-impact actions are incomplete until their redacted audit-chain event is appended and can be verified, unless an incident/legal process explicitly records why delayed audit append is necessary and blocks further broadening until append completes.
- Audit-chain events must include only redacted actor, target, policy-decision, manifest, bundle-hash, and reason-code metadata. They must not include raw source text, exact wishes, contact details, candidate/counterparty identifiers in requester-readable form, message content, legal strategy, hidden abuse heuristics, or exact blocker reasons.
- Verification failures, missing prior hashes, reordered events, deleted events, or hash mismatches trigger the narrowest applicable emergency control or governance pause.
- Audit-chain retention must preserve integrity proofs while redacting or anonymizing linkable participant/counterparty references according to the retention-policy bundle and legal/safety obligations.

## `background_operator_review_quality_controls`

Use an existing reviewer-quality / moderation-QA system if present; otherwise add a compact governed table for calibration, blinded sampling, and review consistency. This table improves the operator safety layer; it is not a participant ranking, candidate ranking, or engagement metric surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `review_lane_key` | `text not null` |
| `review_kind` | enum: `intro_review | exact_field_reveal | safety_blocker_review | partner_grant_review | federation_review | disclosure_review | emergency_release_review` |
| `quality_control_state` | enum: `draft | active | paused | expired | revoked` |
| `calibration_case_set_ref` | `text nullable`; synthetic or formally redacted cases only |
| `second_review_sampling_rate` | `numeric nullable`; repository-standard bounded rate |
| `disagreement_escalation_policy` | `text not null`; redacted policy code |
| `reveal_rate_review_thresholds` | `jsonb not null default '{}'`; aggregate/redacted thresholds only |
| `reviewer_training_expires_at` | `timestamptz nullable` |
| `redacted_quality_summary` | `text nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Operator-review quality requirements:

- High-impact review lanes should reference an active quality-control record where configured. Missing, expired, or wrong-lane records fail closed for promotion and may fail closed for the affected review lane where repository policy requires it.
- Calibration and second-review sampling must use synthetic or formally redacted cases unless a scoped legal/safety process authorizes minimum-necessary production access. They must not expose raw source text, exact wishes, candidate identities, private cohort membership, or hidden abuse heuristics to broad reviewer groups.
- Reviewer-quality metrics may track aggregate reveal rates, overrule rates, disagreement rates, stale-review rates, and policy-decision consistency. They must not become candidate reputation, requester quality score, partner priority, payment priority, engagement optimization, or matching features.
- Disagreement handling must be side-channel-safe and non-disclosing: participants see only generic review/unavailable/stale states unless a later field-level disclosure grant authorizes exact details.

## `background_high_impact_change_approvals`

Use an existing change-management / security-approval system if present; otherwise add a compact table for two-person control over high-impact background-networking changes. This table authorizes governance and safety changes only; it is not a matching, disclosure, or operator-override surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `change_kind` | enum: `purpose_registry_activation \| purpose_semantic_broadening \| risk_review_approval \| public_broad_preview_enablement \| partner_grant_activation \| emergency_control_release \| tripwire_disable_or_broaden \| aggregate_release_approval \| vault_reveal_policy_change \| production_data_exception \| broad_retention_hold` |
| `target_kind` | enum: `purpose_code \| risk_review \| partner_grant \| emergency_control \| runtime_tripwire \| aggregate_release \| vault_policy \| retention_hold \| environment` |
| `target_id` | `uuid nullable` |
| `proposed_by` | `uuid not null` or repository-standard operator identifier |
| `approved_by` | `uuid nullable`; must differ from `proposed_by` where dual control is required |
| `approval_state` | enum: `draft \| pending_second_approval \| approved \| rejected \| expired \| revoked` |
| `separation_of_duties_class` | enum: `single_allowed \| two_person_required \| security_owner_required \| legal_owner_required` |
| `redacted_change_summary` | `text not null` |
| `hard_gate_snapshot` | `jsonb not null`; redacted pass/fail labels only |
| `expires_at` | `timestamptz not null` |
| `created_at` | `timestamptz` |
| `approved_at` | `timestamptz nullable` |
| `revoked_at` | `timestamptz nullable` |

High-impact change-approval requirements:

- A high-impact change must not become active until the required approval state is satisfied. Missing, expired, self-approved, wrong-role, wrong-scope, or stale approval records fail closed.
- The proposer, author, beneficiary, or actor who triggered an incident must not be the sole approver for changes that broaden access, release a stop, disable a tripwire, activate public-broad-preview use, approve partner access, approve aggregate release, or permit production-sensitive data outside production.
- Approval records must be redacted, immutable after approval except for revocation/expiry metadata, and excluded from requester/counterparty/partner surfaces.
- Revocation or expiry must mark dependent policy decisions, feature-flag promotions, partner grants, aggregate releases, emergency releases, and cached artifacts stale; it must not automatically resume matching or disclosure.


## `background_reviewer_conflict_recusals`

Use an existing conflict-of-interest table if present; otherwise add a compact table for operator, reviewer, admin, and partner-seat recusal. This table is a governance safety artifact, not a matching surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `actor_id` | `uuid not null` or repository-standard operator/partner identifier |
| `actor_role` | enum: `operator \| reviewer \| admin \| partner_seat \| system` |
| `target_kind` | enum: `opportunity_brief \| intro_request \| disclosure_grant \| partner_grant \| federation_grant \| risk_review \| pilot_evaluation \| aggregate_release \| emergency_control \| purpose_code \| vault_reveal` |
| `target_id` | `uuid nullable` |
| `conflict_kind` | enum: `self_interest \| affiliation \| prior_relationship \| financial_interest \| partner_interest \| subject_of_review \| other` |
| `state` | enum: `active \| waived_by_policy \| recused \| expired` |
| `redacted_summary` | `text not null` |
| `replacement_reviewer_id` | `uuid nullable` |
| `created_at` | `timestamptz` |
| `expires_at` | `timestamptz nullable` |

Conflict-recusal requirements:

- High-impact review, intro approval, exact-field reveal, partner/federation grant approval, risk-review approval, pilot-evaluation approval, aggregate release, and emergency-control release must check recusal state before action approval.
- Conflicted actors must not approve, reveal, suppress, advance, release, or review targets involving themselves, their organizations, their partner seats, their financial interests, or repository-defined close affiliations unless a documented policy waiver and independent reviewer path applies.
- Recusal records and summaries must be redacted and must not expose exact wishes, source notes, candidate identities, private cohort membership, legal strategy, or hidden abuse heuristics.

## `background_account_security_holds`

Use the repository's existing account-security system if present; otherwise add a compact internal table for high-impact background-networking pauses caused by account compromise, suspicious recovery, credential reset, or step-up failure.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `hold_kind` | enum: `step_up_required \| suspicious_login \| suspicious_recovery \| credential_reset \| account_takeover_review \| participant_requested_lock` |
| `state` | enum: `active \| released \| expired` |
| `blocks_action_kinds` | `text[] not null`; high-impact background-networking actions blocked by this hold |
| `redacted_reason_code` | `text not null` |
| `created_at` | `timestamptz` |
| `expires_at` | `timestamptz nullable` |
| `released_at` | `timestamptz nullable` |

Account-security hold requirements:

- Active holds block high-impact delegate authorization changes, public or partner exposure, candidate budget widening, sensitive-tag confirmation, vault reveal, field-level disclosure grants, and exact-field retrieval until step-up auth or review succeeds.
- Holds must suppress queued sends and stale cached requester/counterparty-visible payloads if they could reveal newly unauthorized state.
- Account-security hold details must not reveal device fingerprints, fraud heuristics, candidate identities, private cohort membership, or hidden abuse signals to ordinary requester/counterparty surfaces.

## `background_participant_correction_requests`

Use an existing support/appeal workflow if present; otherwise add a compact participant-owned correction table for background-networking records. This is for correcting the participant's own data and generic safety decisions; it is not a way to discover candidate-specific private facts.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `target_kind` | enum: `wish_profile \| source_summary \| confirmed_tag \| candidate_exposure \| delegate_authorization \| pairwise_safety_preference \| entity_resolution_claim \| disclosure_grant \| generic_denial_category` |
| `target_id` | `uuid nullable`; null only for generic denial categories |
| `request_kind` | enum: `correct \| revoke \| narrow \| delete \| dispute \| request_review` |
| `state` | enum: `open \| accepted \| rejected \| needs_more_user_info \| closed` |
| `redacted_user_summary` | `text nullable`; stored using sensitive-field convention if free text is allowed |
| `redacted_resolution_summary` | `text nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |
| `closed_at` | `timestamptz nullable` |

Participant-correction requirements:

- Correction requests may operate only on the authenticated participant's own profile, source summaries, tags, exposure settings, authorizations, safety preferences, entity claims about themselves/their organization, disclosure grants, or generic denial categories.
- Responses must be sanitized and must not reveal candidate existence, candidate opt-out, budget, cohort, privacy-stage, retention, exact blocker states, private cohort membership, requester/counterparty identities outside the already-consented context, or hidden abuse heuristics.
- Accepted corrections must update the relevant version, revoke or stale affected lineage, and mark dependent active briefs, intro requests, policy decisions, caches, outbox rows, receipts, exports, and aggregate releases stale where applicable.


## `background_retention_policy_bundles`

Use an existing retention-policy registry if present; otherwise add a compact content-addressed governed table or typed configuration bundle for background-networking retention classes. This bundle defines linkable-retention windows, retained-field allowances, anonymization/deletion rules, cache/outbox invalidation requirements, backup deletion-manifest requirements, and non-actionability guarantees. It is policy infrastructure, not a user-facing disclosure or analytics surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` or stable typed-config id |
| `retention_policy_bundle_version` | `text not null` |
| `retention_policy_bundle_hash` | `text not null`; canonical content hash over the complete sorted retention-policy bundle for this version |
| `supersedes_retention_policy_bundle_version` | `text nullable`; previous retention-policy bundle if this is a governed replacement |
| `artifact_kind` | enum: `delegate_authorization \| wish_profile \| source_summary \| delegate_run \| opportunity_brief \| opportunity_feedback \| intro_request \| disclosure_grant \| receipt \| privacy_freeze \| retention_hold \| emergency_control \| runtime_tripwire \| data_export \| partner_grant \| federation_grant \| aggregate_release \| policy_decision \| candidate_reference_handle \| match_signal_lineage \| candidate_exposure_counter \| vault_artifact \| backup_manifest` |
| `retention_class` | `text not null`; stable retention class for this artifact/action family |
| `active_linkable_window` | `interval nullable` or repository-standard duration; maximum time direct identifiers may remain linkable while the artifact is actionable |
| `participant_review_window` | `interval nullable` or repository-standard duration |
| `operator_review_window` | `interval nullable` or repository-standard duration |
| `anonymize_after` | `interval nullable` or repository-standard duration |
| `delete_after` | `interval nullable` or repository-standard duration |
| `allowed_retained_field_keys` | `text[] not null default '{}'`; minimum fields allowed to remain after active use |
| `linkable_identifier_allowance` | enum: `none \| artifact_ids_only \| active_candidate_ids \| direct_counterparty_ids \| legally_required_identifiers` |
| `cache_outbox_invalidation_required` | `boolean not null default true` |
| `backup_deletion_manifest_required` | `boolean not null default true` |
| `non_actionability_guarantee` | `text not null`; redacted policy code describing why retained records cannot drive matching, notifications, intro advancement, disclosure, exports, or analytics |
| `retention_policy_record_hash` | `text not null`; hash of this retention-policy row's canonical policy fields |
| `status` | enum: `draft \| active \| deprecated \| disabled` |
| `created_at` | `timestamptz` |
| `activated_at` | `timestamptz nullable` |
| `deprecated_at` | `timestamptz nullable` |

Retention-policy bundle requirements:

- The active release/config manifest's `retention_policy_bundle_version` and `retention_policy_bundle_hash` must resolve to an active, complete, content-addressed retention-policy bundle before any background-networking artifact can be created, rendered, cached, exported, retained, anonymized, deleted, restored from backup, or cleaned up.
- Every background-networking artifact kind and retention class used by routes, workers, outboxes, caches, exports, telemetry, vault metadata, backup manifests, and cleanup jobs must have exactly one active retention-policy record in the hashed bundle. Missing, disabled, deprecated, stale-version, stale-hash, wrong-artifact-kind, wrong-retention-class, or partial-bundle policies fail closed.
- A missing or mismatched retention-policy bundle must not become an excuse for indefinite linkable retention. New linkable artifact creation, display, notification, intro advancement, disclosure, export, and backup restore fail closed; existing affected artifacts become non-actionable and require governed cleanup or minimum-necessary safety/legal review under the narrowest applicable current policy.
- Activated retention-policy rows are append-only. Extending linkable windows, widening retained fields, weakening anonymization/deletion/cache-invalidation/outbox-suppression requirements, weakening backup deletion-manifest requirements, changing non-actionability guarantees, or allowing more direct identifiers requires a new `retention_policy_bundle_version`, new `retention_policy_bundle_hash`, privacy or legal review where applicable, and governed release/config activation.
- Retention holds may delay cleanup only within the active retention-policy bundle and the hold's explicit retained-field allowance. A hold must not rewrite retention policy, widen linkable identifier allowance, make held artifacts actionable, or suppress required cache/outbox/export invalidation.
- CI and promotion tests must recompute the canonical retention-policy bundle hash and compare the active bundle against artifact schemas, retention cleanup jobs, cache/outbox invalidation, export generation, backup/restore flows, policy-decision fixtures, retention-hold handling, docs, and public contracts. Same-version in-place mutation, stale docs, orphaned tests, partial bundle materialization, client-supplied retention-policy claims, or retention-policy hash mismatches fail closed before promotion.


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



## `background_backup_retention_manifests`

Use an existing backup/deletion-manifest system if present; otherwise add a compact control table for retention-aware backups, snapshots, disaster recovery, search indexes, and warehouse restores. This table is not a user-facing matching or analytics surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `manifest_kind` | enum: `database_backup \| object_store_snapshot \| search_index_snapshot \| warehouse_snapshot \| disaster_recovery_restore \| deletion_manifest` |
| `scope_kind` | enum: `global \| participant \| cohort \| purpose_code \| retention_class \| artifact` |
| `scope_value` | `text nullable` |
| `state` | enum: `active \| restore_pending \| restored \| expired \| destroyed \| blocked` |
| `encrypted_storage_ref` | `text not null` |
| `contains_background_networking_data` | `boolean not null default true` |
| `deletion_manifest_ref` | `text nullable` |
| `restore_safety_check_state` | enum: `not_required \| pending \| passed \| failed` |
| `retention_expires_at` | `timestamptz not null` |
| `owner_id` | `uuid not null` or repository-standard infrastructure owner |
| `created_at` | `timestamptz` |
| `destroyed_at` | `timestamptz nullable` |

Backup/restore requirements:

- Backups and snapshots must be encrypted, access-limited, time-bounded, excluded from analytics and model evaluation, and subject to retention/destruction schedules.
- Restore processes must replay deletion/redaction/anonymization manifests before restored data can enter active matching, notification, intro, disclosure, search-index, warehouse, or analytics paths.
- Restores must not repopulate cleared candidate/counterparty identifiers, stable candidate hashes, raw source text, exact wishes, expired disclosure grants, revoked authorizations, expired exposure settings, or redacted/anonymized artifacts into active systems.
- Backup manifest summaries must be redacted and must not expose exact wishes, source notes, candidate identities, prompts, message text, private cohort membership, or legal strategy.

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
| `profile_subject_kind` | enum: `individual \| collective`; default `individual` |
| `collective_id` | `uuid nullable`; required only when `profile_subject_kind = collective` if repository supports collectives |
| `collective_authority_version` | `text nullable`; required for active collective profiles |
| `authorized_representative_ids` | `uuid[] not null default '{}'`; representatives allowed to maintain a collective profile |
| `member_data_policy_version` | `text nullable`; required for collective profiles that ingest or summarize collective documents |
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
| `inbound_delegate_partner_grant_ids` | `uuid[] not null default '{}'`; named partner-matchmaker grants the candidate has explicitly allowed, required for partner-matchmaker exposure unless a stricter repository-specific equivalent exists |
| `inbound_delegate_surfaces` | `text[] not null default '{}'`; may include `broad_profile` only after explicit candidate confirmation |
| `inbound_delegate_surface_budget_per_window` | `jsonb not null default '{}'`; per-purpose/per-audience/per-cohort surfacing budget and window settings for inbound delegate discovery |
| `inbound_delegate_pending_intro_limit` | `integer nullable`; maximum pending intro requests allowed from delegate-mediated discovery; required for non-`off` inbound discovery unless a stricter repository default exists |
| `inbound_delegate_cooloff_until` | `timestamptz nullable`; candidate-controlled or safety-imposed cool-off for inbound delegate surfacing |
| `inbound_delegate_confirmed_at` | `timestamptz nullable`; required for non-`off` inbound delegate discovery |
| `inbound_delegate_expires_at` | `timestamptz nullable`; finite expiry / re-confirmation deadline required for non-`off` inbound delegate discovery |
| `candidate_inbound_budget_version` | `text not null` |
| `candidate_exposure_version` | `text not null` |
| `candidate_exposure_confirmed_at` | `timestamptz nullable`; required for non-`off` inbound delegate discovery |
| `candidate_exposure_expires_at` | `timestamptz nullable`; required for non-`off` inbound delegate discovery |
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
- Non-`off` inbound delegate discovery must have `candidate_exposure_confirmed_at` and `candidate_exposure_expires_at`; expired, missing, stale, or migrated-without-reconfirmation exposure is a hard blocker until the candidate explicitly renews it.
- General `discoverability_scope` must not automatically populate or widen `inbound_delegate_discovery`; inbound delegate discovery requires a separate explicit candidate confirmation.
- `inbound_delegate_purpose_codes` must default to an empty set and must be explicitly confirmed separately from ordinary profile discoverability.
- `inbound_delegate_purpose_bindings` must default to an empty map/array and must bind every confirmed inbound purpose code to the exact purpose-policy version shown to the candidate at confirmation time. `inbound_delegate_purpose_codes` must be derived from, or invariant-consistent with, these bindings. A purpose-code registry change, deprecation, split, merge, or material semantic change must not silently preserve prior candidate exposure.
- `inbound_delegate_discovery` must not be broader than `discoverability_scope`.
- `inbound_delegate_surfaces` must default to an empty set and must be limited to broad-preview-safe fields unless a later consent stage explicitly grants more.
- Non-`off` inbound delegate discovery must require explicit budget settings or repository-safe defaults for per-window surfacing, pending intro requests, and cool-off behavior. Unbounded inbound surfacing is invalid.
- Non-`off` inbound delegate discovery must also require `inbound_delegate_confirmed_at` and finite `inbound_delegate_expires_at` values. Expiry must be shown at confirmation time, bounded by a repository-defined maximum duration, and stricter for public-broad-preview exposure than for cohort-only exposure where the repository defines different maxima. Missing expiry, expired confirmation, or stale confirmation is a hard blocker before scoring, surfacing, brief display, feedback advancement, or intro-request creation.
- Candidate surfacing budgets must be enforced server-side across requesters and runs. Participant-facing views may show broad budget status, but must not reveal requester identities, exact sparse counts, private cohort membership, or candidate-specific probing signals.
- Any budget widening, public-scope budget change, pending-intro-limit increase, exposure renewal, or exposure-expiry extension requires explicit candidate confirmation and updates `candidate_inbound_budget_version` and/or `candidate_exposure_version` as appropriate. Budget narrowing, pause, cool-off activation, or exposure-expiry shortening must take effect immediately and mark affected active briefs stale or blocked.
- Public-broad-preview inbound delegate discovery requires both explicit candidate confirmation and the same global/operator rollout gate required for global delegate runs.
- Partner-matchmaker inbound discovery requires explicit candidate confirmation for the named partner grant or repository-equivalent partner workflow. A general `partner_matchmaker` scope must not authorize all current or future partners.
- If `profile_subject_kind = collective`, the collective profile may be surfaced only when the representative authority is current for the selected purpose and scope. Private member-level data in collective documents must not become candidate match input unless the member independently confirms the relevant profile/exposure fields.
- Any change to `opt_in_status`, `discoverability_scope`, `inbound_delegate_discovery`, `inbound_delegate_purpose_codes`, `inbound_delegate_surfaces`, `inbound_delegate_confirmed_at`, `inbound_delegate_expires_at`, inbound budget settings, `allowed_cohort_ids`, or `privacy_stage` must update `candidate_exposure_version` and/or `candidate_inbound_budget_version` and mark dependent active briefs `stale` or budget-blocked. Expiry itself must be treated as a dependency invalidation even if no database row is manually edited at the time of expiry.


Collective-profile requirements:

- Collective profiles are optional. If the repository does not support collectives, reject collective-subject profile creation rather than approximating a collective through an individual's private profile.
- A collective profile must have current representative authority for the exact purpose-code/version, surfaces, cohort/audience scope, and exposure setting being used. Expired, revoked, disputed, missing, or wrong-scope authority is a hard blocker before scoring, surfacing, notifications, feedback advancement, or intro-request creation.
- Collective source summaries may create matchable signals only about the collective's explicitly confirmed public/broad wishes, offers, capabilities, or non-sensitive public context. Member rosters, private member wishes, vulnerabilities, affiliations, strategy, internal disagreement, or contact details must be redacted or treated as third-party data unless the relevant member independently confirms it.

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
| `partner_matchmaker_grant_id` | `uuid nullable`; required when `audience_scope = partner_matchmaker` unless an existing repository grant primitive is used |
| `min_confidence_band` | enum: `medium \| high` |
| `max_runs_per_week` | `integer not null` |
| `max_briefs_per_week` | `integer not null` |
| `max_candidates_per_run` | `integer not null` |
| `authorization_confirmed_at` | `timestamptz not null`; server-confirmed timestamp shown to the participant when the mandate was granted or renewed |
| `expires_at` | `timestamptz not null`; server-bounded expiry / renewal deadline, not a client-only value |
| `renewed_from_authorization_id` | `uuid nullable`; prior authorization if this is an explicit renewal rather than silent extension |
| `revoked_at` | `timestamptz nullable` |
| `authorization_version` | `text not null` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Requirements:

- `allowed_purpose_codes` must be nonempty, allowlisted, and narrower than a general-purpose networking mandate.
- `allowed_purpose_bindings` must bind each allowed purpose code to the exact registry version presented to the participant; material changes to purpose-code meanings require explicit re-confirmation rather than silent reuse.
- If multiple purpose codes are authorized, they authorize separate single-purpose runs only; they must not authorize a combined multi-purpose scan, and each run must select exactly one bound `{purpose_code, purpose_policy_version}` pair.
- `audience_scope` defaults to `cohort_only` or the repository’s safest equivalent.
- `partner_matchmaker` authorization must reference a current active named partner grant covering the exact partner/workflow, purpose-code/version, surfaces, quotas, and cohort/audience scope. Missing, expired, revoked, wrong-purpose, wrong-version, wrong-surface, wrong-cohort, or wrong-partner grants fail closed.
- `authorization_confirmed_at` and `expires_at` must be set server-side and shown to the participant at confirmation time. The server must enforce repository-defined maximum authorization durations by purpose risk tier, audience scope, and rollout stage; public-broad-preview and high-risk purposes must have stricter maximums than cohort-only low-risk pilots unless the repository documents a stricter general rule.
- Renewal or expiry extension requires an explicit participant confirmation and a new `authorization_version`; silent background renewal, auto-extension from profile activity, or client-only expiry changes are invalid.
- `public_broad_preview` authorization is allowed only if `BACKGROUND_GLOBAL_DELEGATE_RUNS_ENABLED=true` and an operator-approved rollout gate exists.
- Revoked, expired, stale-renewal, or overlong authorizations must cancel pending delegate runs, prevent future opportunity creation, and mark dependent active briefs as `stale`.

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
- Source-summary synthesis may create proposed tags for review, but every proposed and confirmed tag must map to the current content-addressed `background_signal_taxonomy` before it can be confirmed or used.
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
| `partner_matchmaker_grant_id` | `uuid nullable`; required for partner-matchmaker runs unless an existing repository grant primitive is used |
| `allowed_surfaces_snapshot` | `text[] not null` |
| `purpose_code_snapshot` | `text not null` |
| `purpose_policy_version_snapshot` | `text not null` |
| `max_candidates` | `integer not null` |
| `eligible_pool_size_bucket` | enum: `withheld \| 5_to_9 \| 10_to_24 \| 25_plus` |
| `anti_probe_state` | enum: `clear \| broadened \| withheld \| blocked` |
| `anti_probe_scope_snapshot` | `jsonb not null default '{}'`; redacted service-side anti-probing scope including account/partner/workflow/cohort buckets, never requester-visible |
| `receipt_id` | `uuid nullable` |
| `policy_decision_id` | `uuid nullable`; redacted reference to the canonical policy decision for run enqueue/execution |
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
| `policy_decision_id` | `uuid nullable`; redacted reference to the canonical policy decision used for brief creation/display where retained |
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

## `background_opportunity_brief_internal_dependencies`

Use an existing protected internal dependency store if present; otherwise add a service-role-only table for candidate references and candidate-specific dependency snapshots. This table is the preferred home for fields that earlier schemas may have stored on `background_opportunity_briefs`; participant-facing brief rows and projections should not contain these fields.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `opportunity_brief_id` | `uuid not null` |
| `participant_id` | `uuid not null`; service-side join only |
| `candidate_handle_id` | `uuid nullable`; run-scoped handle, not requester-visible |
| `candidate_profile_id` | `uuid nullable`; identity/contact-service only while active |
| `candidate_reference_state` | enum: `active \| redacted \| anonymized \| expired` |
| `candidate_dependency_snapshot` | `jsonb not null default '{}'`; candidate opt-in, exposure, budget, cohort, privacy-stage, and stale-check versions as redacted internal labels only |
| `candidate_gate_internal_codes` | `text[] not null default '{}'`; exact service-side blocker classes, never requester-visible |
| `candidate_key_hash` | `text nullable`; active-only dedupe key, cleared or replaced with non-linkable aggregate state on redaction/anonymization |
| `policy_decision_id` | `uuid nullable`; internal decision used for creation/revalidation |
| `retention_expires_at` | `timestamptz not null` |
| `redacted_at` | `timestamptz nullable` |
| `anonymized_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Internal-dependency isolation requirements:

- Ordinary authenticated requester/counterparty routes, client components, exports, receipts, telemetry builders, partner callbacks, and debug endpoints must not read this table directly or indirectly.
- Sanitized opportunity projections may include only generic dependency labels derived by service code, never raw candidate dependency snapshots, candidate handles, candidate profile ids, candidate-key hashes, exact gate codes, or exact stale causes.
- On redaction, anonymization, candidate exposure revocation, privacy freeze, participant deletion, retention cleanup, or backup restore, clear `candidate_profile_id`, clear or coarsen `candidate_key_hash`, and make the dependency row unusable for matching, intro advancement, notifications, candidate-specific analytics, or future candidate resolution unless a valid active safety/legal hold requires minimum-necessary retention.
- If a legacy `background_opportunity_briefs` row still stores candidate identifiers or candidate-dependency snapshots, new ordinary-user routes must fail closed until migrations, column-level grants, sanitized-view tests, and serializer tests prove those internal fields cannot be selected, spread, cached, logged, exported, or serialized.

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

Opportunity-feedback requirements:

- Feedback rows are action records, not profile-learning records. `interested`, `dismissed`, `maybe_later`, `report`, views, receipt clicks, and notification interactions must not become match inputs or hidden preference vectors.
- A feedback event may update only the relevant brief status, intro-request state, retention/cool-off state, participant-visible receipt, and redacted safety workflow. It must not update the participant's wish profile, confirmed broad tags, scoring weights, candidate exposure state, candidate reputation, or popularity metrics unless the participant explicitly confirms a separate schema-bound broad profile update.
- If the product wants to learn from feedback, it must present a participant-visible field/tag proposal and require explicit Apply/Confirm before that proposal can influence matching. Unconfirmed learned preferences are proposal-only and must be treated like other unconfirmed derived tags.
- Free-text feedback and reports must be encrypted, retention-bound, excluded from matching, and excluded from requester-visible telemetry or exports except as redacted aggregate safety labels.

## `background_intro_requests`

Use an existing table if present; otherwise add:

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `requester_id` | `uuid not null` |
| `counterparty_profile_id` | `uuid nullable`; required only while `counterparty_reference_state = active` |
| `opportunity_brief_id` | `uuid nullable` |
| `idempotency_key` | `text not null`; server-derived from requester, opportunity brief, purpose code, purpose-policy version, and intro-flow version |
| `state` | enum: `requested \| operator_review \| counterparty_pending \| mutual_consent \| approved_contact \| declined \| appealed \| closed` |
| `requested_disclosure_fields` | `text[] not null` |
| `purpose` | `text not null` |
| `purpose_code` | `text not null` |
| `purpose_policy_version` | `text not null` |
| `source_brief_dependency_state` | enum: `valid \| stale_blocked` |
| `counterparty_reference_state` | enum: `active \| redacted \| anonymized` |
| `receipt_id` | `uuid nullable` |
| `policy_decision_id` | `uuid nullable`; internal/redacted reference to the canonical policy decision for intro creation/status rendering |
| `expires_at` | `timestamptz not null` |
| `retention_expires_at` | `timestamptz not null` |
| `closed_at` | `timestamptz nullable` |
| `anonymized_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Counterparty reference-state requirements:

- Background-networking intro requests must be created from a valid active opportunity brief owned by the requester. The client must not be allowed to submit or override `counterparty_profile_id`, candidate profile ids, candidate hashes, private cohort ids, candidate-specific stale causes, or free-form counterparty target descriptors.
- The server must derive `counterparty_profile_id` only from the internal active opportunity brief after revalidating requester authorization, purpose code/version, candidate exposure, candidate budget, stale state, emergency controls, tripwires, retention state, and operator-review eligibility.
- The server must derive and enforce an idempotency key for background-networking intro creation. Use a unique constraint, transaction, queue de-duplication primitive, or repository-standard idempotency layer so that at most one active intro request can exist for the same requester-owned opportunity brief and inherited purpose-code/version pair.
- Replays, duplicate client submissions, double-clicks, queue retries, worker retries, and repeated `interested` feedback must return the existing sanitized projection or a generic already-pending/conflict response without creating another active intro request, another participant-visible receipt for the same transition, another operator-review task, another candidate budget reservation/counter increment, or another notification.
- A stale, closed, declined, expired, redacted, anonymized, or retention-held-only intro request must not be reactivated by a replay; any renewed attempt must require recomputation from currently valid inputs and, where applicable, a new opportunity brief rather than reuse of stale candidate references.
- `counterparty_profile_id` may be populated only while `counterparty_reference_state = active` and the intro request is in an active consent/review state.
- When an intro request is declined, closed, expired, deleted, or past its safety/legal hold, set `counterparty_reference_state` to `redacted` or `anonymized` and clear `counterparty_profile_id` unless a legally required or active safety hold explicitly requires retaining it.
- Redacted/anonymized intro-request records may preserve coarse state, dates, decision labels, and redacted audit metadata, but must not preserve a direct counterparty UUID or any stable candidate-specific join key.

Intro-request sanitized projection requirements:

- Provide a sanitized requester-facing intro-request projection or server-side DTO separate from the internal `background_intro_requests` row shape.
- Requester-facing intro responses may include only requester-safe fields: intro request id, source opportunity-brief id or receipt id when requester-owned, broad purpose label/code, generic state, requested disclosure-field categories, expiry/review-window bucket, generic dependency label, receipt id, and allowed actions.
- Requester-facing intro responses must exclude `counterparty_profile_id`, exact counterparty identity, candidate/counterparty hashes, private cohort membership, candidate exposure/budget/cool-off state, exact operator notes, exact decline/expiry causes, contact details, exact wishes, source notes, and any field that can join the request back to a candidate before mutual consent.
- Intro-request requester-facing payloads must use a versioned explicit allowlist schema with extra-key rejection/stripping before logging, caching, telemetry, exports, notification construction, or network response.

Counterparty-facing intro-consent projection requirements:

- Provide a sanitized counterparty-facing intro-consent projection or server-side DTO separate from the internal `background_intro_requests` row shape and separate from the requester-facing intro projection.
- Counterparty-facing intro-consent payloads may include only minimum broad context needed to decide whether to continue: broad purpose label/code, broad requested disclosure categories, generic requester-safe rationale, generic operator-review status, coarse expiry/review-window bucket, redacted receipt id if appropriate, and choices such as `review`, `decline`, `report`, or `ask_for_more_context`.
- Counterparty-facing payloads must exclude requester exact identity, contact details, exact wishes, source notes, private cohort membership, exact requester strategy, exact requester-side source-summary dependencies, internal opportunity-brief rows, requester candidate-search details, exact targeting reason, candidate/counterparty hashes, and any field that can join the consent prompt back to the requester before a later field-level grant permits it.
- Counterparty-facing accept/decline/report/timeout/request-more-context states must be represented internally with exact state where needed, but requester-facing projections must collapse them into generic states such as `counterparty_pending`, `declined_or_unavailable`, `review_requested`, or `closed` unless the counterparty explicitly consents to reveal more.
- `ask_for_more_context` must create a sanitized disclosure-request artifact rather than opening a freeform backchannel. The artifact may contain only broad allowlisted disclosure categories requested, generic rationale, coarse review window, requester-owned brief/receipt reference, and safe next actions. Any additional context returned to the counterparty requires requester approval, operator review where required, and a versioned sanitized counterparty-facing payload.
- Counterparty-facing intro-consent payloads and request-more-context payloads must use versioned explicit allowlist schemas with extra-key rejection/stripping before logging, caching, telemetry, exports, notification construction, email rendering, or network response.

## `background_mediated_contact_sessions`

Use an existing in-product messaging / relay primitive if present; otherwise add a compact table for purpose-bound, privacy-preserving first-contact sessions after mutual consent. This table is not a general social messaging product and must not become a behavioral ranking surface.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `intro_request_id` | `uuid not null` |
| `purpose_code` | `text not null` |
| `purpose_policy_version` | `text not null` |
| `session_state` | enum: `pending_review | active | paused | closed | expired | frozen | blocked` |
| `participant_a_id` | `uuid not null` |
| `participant_b_id` | `uuid not null` |
| `allowed_message_kinds` | `text[] not null default '{}'`; e.g. `broad_intro_note`, `scheduling_intent`, `ask_for_field_grant`, `decline_or_pause` |
| `boundary_settings` | `jsonb not null default '{}'`; broad topic/channel/timing boundaries, no exact private fields |
| `attachment_policy` | enum: `none | allowlisted_safe_links_only | operator_review_required` |
| `external_contact_disclosure_state` | enum: `none | requested | granted_by_field_grant | revoked | blocked` |
| `output_schema_version` | `text not null` |
| `ui_copy_bundle_version` | `text not null` |
| `policy_decision_id` | `uuid not null` |
| `retention_expires_at` | `timestamptz not null` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |
| `closed_at` | `timestamptz nullable` |

Mediated-contact requirements:

- A mediated contact session may be created only from a valid mutual-consent intro request after all disclosure/contact hard gates and required operator review pass.
- The session must not disclose external contact fields, full profile identity, exact location, raw source notes, exact wishes, or private constraints unless a separate field-level disclosure grant names those exact field keys.
- Relay payloads must be versioned, allowlisted, rate-limited, queue-freshness-bound, and side-channel-safe. Message content must not be used for matching, ranking, engagement optimization, model training, public reports, or generic product analytics.
- Participants must be able to decline, pause, block, freeze, or close a session without giving a reason. Those actions must be generic to the other side and must not become reputation or match-quality signals except through explicit confirmed profile updates or redacted safety workflows.
- Attachments, links, meeting locations, calendar writes, and external account handles are disabled by default and require explicit policy/action-kind coverage before use.
- Session expiration, closure, block/mute preference, privacy freeze, disclosure-grant revocation, emergency control, or retention cleanup must suppress queued relay sends, stale cached views, and redact/anonymize message records according to the retention-policy bundle.

## `background_disclosure_grants`

Use an existing field-level privacy-grant table if present; otherwise add a compact table for post-mutual-consent disclosure. This table is not a matching surface and must not be used for ranking, profiling, public analytics, or future unrelated introductions.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `grantor_id` | `uuid not null`; participant who is disclosing exact fields |
| `recipient_id` | `uuid not null`; participant who may view the granted fields |
| `intro_request_id` | `uuid not null` |
| `opportunity_brief_id` | `uuid nullable`; requester-owned source brief when applicable |
| `purpose_code` | `text not null` |
| `purpose_policy_version` | `text not null` |
| `grant_state` | enum: `active \| revoked \| expired \| closed` |
| `granted_field_keys` | `text[] not null`; explicit allowlisted exact fields or field categories |
| `redacted_grant_summary` | `jsonb not null`; requester/counterparty-safe summary of the grant |
| `recipient_acknowledgement_state` | enum: `not_required | pending | acknowledged | expired | revoked` |
| `recipient_access_state` | enum: `not_viewed | access_available | coarsely_viewed | expired | revoked` |
| `latest_access_window_bucket` | `text nullable`; coarse participant-safe bucket only, never exact open time |
| `access_token_expires_at` | `timestamptz nullable`; required for server-rendered exact-field access links |
| `copy_download_policy` | enum: `view_only_default | explicit_download_grant_required | download_allowed_after_acknowledgement` |
| `recipient_use_boundary_copy_key` | `text not null`; UI-copy key for purpose-bound use / no-reshare warning where applicable |
| `revocation_effect_copy_key` | `text not null`; UI-copy key distinguishing future-access revocation from retroactive erasure |
| `grant_version` | `text not null` |
| `expires_at` | `timestamptz not null` |
| `revoked_at` | `timestamptz nullable` |
| `retention_expires_at` | `timestamptz not null` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Disclosure-grant requirements:

- Create or widen a disclosure grant only after all inherited hard gates pass, operator review approves the relevant consent step, the grantor explicitly consents to the exact field keys being disclosed, and the recipient completes any configured purpose-bound acknowledgement before exact fields are rendered.
- Grants must be purpose-bound, field-bound, time-bounded, revocable, and non-transitive. A grant for one intro request must not authorize later matches, profile enrichment, analytics, exports, model training, or disclosure to third parties.
- Grant payloads must be generated from current explicitly confirmed fields or explicitly granted exact fields. Raw source notes, full source summaries, hidden model outputs, candidate-dependency snapshots, private cohort membership, exact targeting reasons, and unconfirmed tags remain undisclosed unless they are separately allowed as explicit field keys under the same consent flow.
- Exact-field access should be served through short-lived server-rendered views, expiring links, or repository-equivalent access controls that revalidate the grant, privacy freeze, emergency controls, output schema, UI-copy bundle, client-surface integrity policy, and retention state at view/download time. Bulk download/copy affordances are disabled by default unless the grant explicitly allows them.
- Revocation or expiry blocks future access, marks dependent active disclosure surfaces stale, schedules retention cleanup, invalidates access tokens, and must not reactivate stale or closed artifacts. Previously viewed information cannot be technically clawed back, so the UI must describe revocation as future-access revocation rather than retroactive erasure.
- Access-state labels visible to either party must be coarse and non-coercive. Do not expose exact open times, dwell time, screenshot/copy attempts, or engagement signals; such data must not become matching, reputation, pressure, reminder, or analytics features.
- Requester-facing and counterparty-facing disclosure-grant payloads must use versioned allowlist schemas with extra-key rejection and must not expose internal row shapes, counterparty identifiers beyond the consented disclosure, exact audit notes, operator notes, source notes, or hidden safety heuristics.

## `background_delegate_receipts`

Use an existing transparency-receipt or audit-event table if present; otherwise add a compact participant-owned receipt table. This table is for redacted accountability and user comprehension, not analytics export, ranking, operator browsing, or candidate discovery.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `event_kind` | enum: `background_opt_in_changed \| delegate_authorization_created \| delegate_authorization_renewed \| delegate_authorization_revoked \| inbound_exposure_confirmed \| inbound_exposure_renewed \| inbound_exposure_paused \| inbound_exposure_revoked \| notification_preferences_updated \| source_summary_added \| source_summary_approved \| source_summary_revoked \| broad_tag_confirmed \| broad_tag_revoked \| delegate_run_created \| opportunity_brief_created \| opportunity_brief_marked_stale \| opportunity_feedback_recorded \| intro_request_created \| counterparty_prompt_sent \| disclosure_grant_created \| disclosure_grant_revoked \| privacy_freeze_activated \| privacy_freeze_released \| data_export_requested \| data_export_ready \| data_export_expired \| correction_request_created \| correction_request_resolved \| retention_cleanup_applied \| operator_field_reveal_recorded \| vault_reveal_recorded` |
| `receipt_visibility_state` | enum: `participant_visible \| delayed_for_safety \| internal_only_redacted \| anonymized` |
| `related_artifact_kind` | enum nullable: `delegate_authorization \| candidate_exposure \| notification_preference \| source_summary \| match_signal_lineage \| delegate_run \| opportunity_brief \| opportunity_feedback \| intro_request \| disclosure_grant \| privacy_freeze \| data_export \| correction_request \| retention_cleanup \| operator_reveal \| vault_reveal` |
| `delegate_authorization_id` | `uuid nullable` |
| `delegate_run_id` | `uuid nullable` |
| `opportunity_brief_id` | `uuid nullable` |
| `intro_request_id` | `uuid nullable` |
| `disclosure_grant_id` | `uuid nullable` |
| `output_schema_version` | `text not null` |
| `output_schema_bundle_version` | `text not null` |
| `output_schema_bundle_hash` | `text not null` |
| `ui_copy_bundle_version` | `text not null` |
| `ui_copy_bundle_hash` | `text not null` |
| `copy_locale` | `text not null default 'en'` |
| `policy_decision_id` | `uuid nullable`; required for action-generated receipts and nullable only for inert migration/backfill receipts that expose no participant-owned exact data or action state |
| `redacted_payload` | `jsonb not null` |
| `prev_hash` | `text nullable` |
| `entry_hash` | `text not null` |
| `retention_expires_at` | `timestamptz not null` |
| `visible_after` | `timestamptz nullable`; used only when delayed visibility is required to avoid compromising a safety/legal process or exposing another person's private state |
| `anonymized_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |

Receipt payload requirements:

- Include only participant-safe broad event labels, broad purpose code/version where applicable, broad surfaces used, authorization or exposure scope type, confidence band where relevant, generic dependency-state label, coarse retention/deletion state, server-generated receipt copy key, and requester-safe visible count buckets. Factor-code and blocker-code counts may be included only as bucketed/generic aggregates; candidate-specific gate counts must be suppressed or coarsened so they cannot reveal opt-out, budget, cohort, privacy-stage, retention, prior-dismissal/report, or third-party-data state.
- Receipts for operator field reveal, vault reveal, legal/safety review, or internal retention/legal holds may be delayed or internal-only redacted where immediate participant visibility would expose another person's private state, compromise an abuse investigation, or violate a legal/safety obligation. Delayed receipts must become participant-visible when the hold/review state permits, or anonymize under the retention-policy bundle if they cannot safely be shown.
- Exclude raw source text, exact wishes, contact details, exact candidate identity, exact private cohort membership, prompts, message text, free-text reports, private notes, exact operator notes, legal strategy, hidden gate outcomes, rare-combination internals, and abuse heuristics.
- If the repository already has local transparency receipts, extend that mechanism rather than creating a parallel ledger. Receipt renderers must use active output-schema and UI-copy bundle entries and fail closed on stale schema/copy hashes.

Retention lifecycle requirements:

- Active opportunity briefs may keep internal candidate references only until `brief_expires_at`, closure, dismissal, report resolution, intro-request conversion, or participant deletion, whichever retention policy says comes first.
- After the retention window and any safety-review hold, replace linkable candidate references with non-linkable redacted state, clear active-only `candidate_profile_id`, `counterparty_profile_id`, and stable `candidate_key_hash` values, delete or anonymize free-text feedback, and keep only aggregate/redacted audit metadata.
- Participant deletion must remove participant-owned background artifacts except redacted/anonymized audit rows explicitly retained for safety, abuse prevention, or legal obligations.
- Retention jobs must be idempotent and auditable through redacted receipts, without exporting raw source text, exact wishes, exact candidate identity, or private cohort membership.


---

# APIs

Prefer existing paths if already implemented. Otherwise implement the following.

## Internal `evaluateBackgroundPolicyDecision(...)`

Internal service function required; expose no public route unless the repository already has an internal-only policy API.

Requirements:

- Accept an explicit `action_kind` from the current governed policy-action-kind registry, actor identity/role, participant/counterparty context where applicable, purpose-code/version, surfaces, output-schema version, dependency versions, and candidate/reference handles only as server-side references. Reject broad, catch-all, disabled, deprecated, wrong-lane, wrong-actor, client-supplied, partner-supplied, or unregistered action kinds before evaluating any consent or safety gates.
- Evaluate requester authorization, candidate exposure, candidate budgets, participant privacy-freeze state, purpose registry, signal taxonomy, match-input lineage, run-scoped candidate-handle validity, entity-resolution state, quasi-identifier / rare-combination risk, high-impact consent confirmation, risk review, emergency controls, runtime tripwires, pairwise safety preferences, retention holds, vault key state, disclosure grants, stale dependencies, anti-probing state, model-data-use restrictions, export-scope restrictions, and output-schema compatibility in one canonical decision path.
- Return only `allow`, `deny`, `stale`, or `needs_review`, redacted reason classes, policy-engine version, policy-action-kind registry version, expiry, action-idempotency binding where applicable, and a policy-decision id. It must not return candidate identifiers, exact blocker reasons, exact timing, internal dependency snapshots, vault contents, or abuse heuristics to requester-facing callers.
- Policy decisions are short-lived, action-specific, and not reusable bearer capabilities. A decision for display cannot authorize notification; a decision for intro creation cannot authorize field disclosure; a decision for retention cleanup cannot authorize matching. Side-effecting allow decisions must be atomically consumed before the side effect executes, and the consume step must bind the decision to the exact idempotency key, execution context, lane key, bundle hash, output-schema version, and dependency snapshot.
- Missing, stale, client-supplied, unregistered-action-kind, catch-all-action-kind, wrong-action, wrong-schema, wrong-purpose, or expired policy decisions fail closed across routes, workers, operator actions, outbox sends, caches, exports, telemetry, and tests.

## Internal `propagateBackgroundDependencyStaleness(...)`

Internal service function required; expose no public route unless the repository already has an internal-only dependency-invalidation API.

Requirements:

- Accept only server-side dependency refs, dependency kinds, stale reason codes, and affected artifact families; reject client-supplied dependency invalidation requests.
- Mark matching `background_artifact_dependency_edges` stale, enqueue stale propagation for dependent active artifacts, suppress queued sends, invalidate caches/exports/screen states/effective-permission previews, and schedule retention cleanup where required.
- Return only redacted aggregate counts and worklist ids to operators; requester/counterparty-facing surfaces receive only generic stale/recompute/unavailable labels.
- Missing dependency edges, failed propagation, stuck worklists, or stale propagation older than the queue-freshness policy must block affected renders/sends/exports/intros/disclosures/relays until recomputed from current inputs.

## `GET /api/background/purpose-codes`

Auth optional for broad public docs; auth required if returning rollout-gated or cohort-specific availability.

Returns the current active purpose-code registry entries that the user may select.

Requirements:

- Return only broad labels, canonical summaries, purpose codes, purpose-policy versions, risk tiers, and allowed broad surfaces.
- Do not return internal abuse heuristics, private rollout notes, exact cohort membership, disabled experimental codes, or deprecated internal-only purpose notes.
- The values returned by this route must come from the same registry artifact used by authorization, candidate-exposure, delegate-run, opportunity-brief, receipt, intro-request, and test validation.
- If a purpose code is deprecated, superseded, disabled, or requires re-confirmation, the route must clearly mark that state and must not present it as selectable for new authorization.


## `POST /api/background/effective-permission-previews`

Auth required. Step-up authentication may be required where the proposed action would require step-up at confirmation time.

Creates or refreshes a short-lived, participant-owned effective-permission preview for a proposed Background Delegate action.

Requirements:

- Generate the preview server-side from the active release manifest, phase-gate bundle, policy-composition bundle, output-schema bundle, current participant consent/exposure/freeze/hold state, purpose registry, signal taxonomy, claim-assurance taxonomy where applicable, and retention-policy bundle.
- Return only generic before/after labels, data-use categories, audience/surface categories, expiry/reconfirmation effects, revocation effects, hidden-data categories, risk label, and allowed next-step labels.
- Do not return candidate/counterparty identifiers, hidden blockers, exact gate outcomes, internal dependency snapshots, rare-combination internals, abuse heuristics, raw source text, exact wishes, private cohort membership, or operator notes.
- A preview must expire quickly and must become stale when the form input, output schema, release manifest, policy dependency, authorization, exposure, freeze, hold, grant, or retention state changes.
- The endpoint must not activate any authorization, exposure, tag, budget, intro, disclosure, export, vault reveal, or freeze release. Activation requires a later explicit confirmation and a fresh action-specific policy decision.

## Internal release-manifest activation / deployment gate

Internal/deployment auth required.

Creates, approves, activates, supersedes, or rolls back a background-networking release/config manifest.

Requirements:

- This is not a user-facing consent, matching, disclosure, or analytics endpoint.
- Activation for production, non-staff, partner, federation, public-broad-preview, or high-sensitivity lanes requires configured dual control, conflict-recusal checks, current risk/pilot/safety-case coverage, and successful manifest-contract tests.
- The manifest must bind the exact code version, migrations, policy engine, policy-action-kind registry, purpose registry, signal taxonomy, claim-assurance taxonomy, retention-policy bundle, output-schema bundle, tool-capability registry, feature-flag defaults, and aggregate-release controls by version and content hash where defined.
- Rollback must not reactivate stale authorizations, deprecated purpose semantics, disabled tools, stale schemas, expired risk reviews, or retention-expired/anonymized data.

## `POST /api/background/delegate-authorizations`

Auth required.

Creates or updates the participant’s standing authorization for a background delegate.

Requirements:

- Validate allowed purpose codes and allowed surfaces against allowlists.
- Validate purpose codes against the current versioned purpose-code registry; reject user-defined purpose codes, deprecated codes, disabled codes, superseded codes without explicit migration, catch-all codes, and any request that tries to rely on a materially changed purpose code without explicit re-confirmation.
- Store exact per-purpose `allowed_purpose_bindings` from the registry records shown to the participant at confirmation time; do not accept client-supplied versions that do not match the server registry. For public-broad-preview, partner-matchmaker, high-sensitivity signal, collective-authority, or other repository-defined high-impact scopes, require an explicit no-dark-pattern comprehension/confirmation event.
- Require a server-confirmed expiry / renewal deadline, maximum runs per week, maximum briefs per week, maximum candidates per run, and minimum confidence band. Reject missing, client-only, already-expired, or repository-max-exceeding expiry values; compute and store `authorization_confirmed_at` and the accepted `expires_at` server-side.
- Default audience scope to `cohort_only` or a named `partner_matchmaker` grant; do not allow global scope unless `BACKGROUND_GLOBAL_DELEGATE_RUNS_ENABLED=true` and operator rollout approval exists.
- Require a current active named partner grant for `partner_matchmaker` audience scope, and reject requests that rely on a generic partner category, stale grant, wrong partner/workflow, wrong purpose-policy version, wrong surface, or wrong cohort.
- Return the authorization id and a plain-language summary of the delegate's purpose, what it may search, what it is not allowed to do, when the authorization expires, and how renewal/revocation works.
- Do not enqueue a helper run from this route unless the user explicitly chooses “run now.”

## `POST /api/background/delegate-authorizations/:id/revoke`

Auth required.

Revokes a delegate authorization. Pending runs under that authorization must be cancelled, dependent active briefs must be marked `stale`, and no new opportunity briefs may be created from it. Revocation must also schedule retention cleanup for closed, stale, or expired dependent artifacts according to the artifact lifecycle policy.

## `POST /api/background/wish-profile`

Auth required.

Creates or updates a structured wish profile.

Requirements:

- Validate against an allowlist schema.
- Validate all submitted matchable fields and tags against the current signal taxonomy; unclassified or prohibited signal keys are rejected and high-sensitivity/vulnerability-like fields require the configured confirmation/review path.
- Reject exact contact details.
- Reject protected-trait inference.
- Reject ideology/psychology inference.
- Reject hidden preference fields.
- Do not trigger live matching unless `BACKGROUND_DELEGATE_RUNS_ENABLED` is true, the user explicitly opted in, and an active delegate authorization exists.
- Validate `discoverability_scope` and `allowed_cohort_ids`; global broad-preview discovery must not be silently enabled.
- Do not create, widen, or re-enable `inbound_delegate_discovery` from this route. Profile discoverability updates must not silently change delegate-mediated exposure.
- Update `profile_version` and `last_confirmed_at` only when the participant explicitly applies or confirms the fields that may influence matching. Each applied matchable field must create or update a match-input lineage record; unlineaged fields remain draft/non-matchable. Do not perform entity-resolution merges or duplicate-profile linking from this route unless the participant explicitly verifies the identity/organization link through the repository's identity-confirmation flow.

## `POST /api/background/subject-identity`

Auth required; operator or organisation-admin auth required where the subject is an organisation, collective, automated agent, service account, or partner/operator seat.

Creates, confirms, updates, narrows, disputes, or revokes the subject-identity profile for the participant or represented entity.

Requirements:

- Treat this as separate from ordinary profile content and ordinary discoverability.
- Reject attempts to present an automated agent, organisation, collective, service account, or partner/operator seat as an ordinary individual.
- Require current representative authority, human accountable owner, scope, and expiry for non-individual or automated subjects.
- Exact organisation names, staff names, account identifiers, partner-seat ids, and contact details remain hidden until the relevant consent/disclosure stage; requester-facing and counterparty-facing surfaces may use only sanitized subject-kind labels unless a field-level grant permits more.
- Any subject-kind, automation, authority, scope, or accountability change updates `subject_identity_version`, marks dependent artifacts stale, and invalidates dependent policy decisions, caches, receipts, exports, partner/federation outputs, and intro requests.

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
- For `partner_matchmaker` inbound discovery, require explicit confirmation of the named partner grant(s) or repository-equivalent partner workflow. Do not treat a generic partner-matchmaker category as consent to future partners.
- Restrict `inbound_delegate_surfaces` to broad-preview-safe fields unless an active later-stage privacy grant permits more.
- Require finite exposure expiry / re-confirmation windows for any non-`off` exposure.
- Require bounded per-purpose/per-scope inbound surfacing budgets, pending-intro limits, and cool-off settings for any non-`off` exposure. Reject unbounded inbound surfacing, unbounded pending-intro queues, or budget settings that are broader than the confirmed audience/cohort scope.
- Require a finite exposure expiry / re-confirmation deadline for any non-`off` exposure. Reject missing, already-expired, repository-max-exceeding, or client-only expiry values; compute and store the server-confirmed `inbound_delegate_confirmed_at` and `inbound_delegate_expires_at` values shown to the candidate.
- Widening budgets, increasing pending-intro limits, shortening cool-offs, extending exposure expiry, renewing exposure, or enabling public-broad-preview budgets requires explicit confirmation and updates `candidate_inbound_budget_version` and/or `candidate_exposure_version`. Narrowing, pausing, reducing budgets, or shortening exposure expiry must take effect immediately.
- On any exposure narrowing, purpose removal, pause, revocation, expiry, or cohort removal, update `candidate_exposure_version`, mark dependent active briefs `stale`, block new surfacing, and schedule retention cleanup for affected inactive artifacts.

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
- Accept only a server-known list of proposed tags or participant-entered broad tags that pass the same schema, allowed-field validation, and current signal-taxonomy validation.
- Reject confirmation of tags derived from private third-party data unless the tag has been redacted into the participant's own broad wish/offer/capability or non-sensitive public context, or the relevant third party independently confirms it through their own profile/exposure settings.
- Display or return every tag and allowed-field key being confirmed; do not allow silent bulk confirmation of hidden or model-generated tags.
- Store per-tag confirmation records tied to the current `source_summary_version`, allowed-field policy, and confirmation actor.
- Moving a tag into `confirmed_broad_tags` must be an explicit participant action and must create an active match-input lineage record for the current source-summary version, allowed-field policy, taxonomy version, and purpose binding; source-summary approval, file import, LLM synthesis, or operator review must not silently confirm tags for matching.
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
- Enforce the minimum eligible-pool floor, cross-route / abuse-principal anti-probing budgets, and anti-probing checks before scoring.
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
- Internal-only candidate identifiers, candidate-dependency snapshots, exact blocker states, exact timing fields, match-input lineage internals, entity-resolution status, and retention/anonymization causes must be absent from the response object before logging, telemetry, caching, or rendering. The route must also apply the quasi-identifier / rare-combination redaction check to the complete response shape, not merely to individual fields.
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
- Do not convert `interested`, `dismissed`, `maybe_later`, `report`, view, click, dwell-time, or notification-interaction events into hidden matching features, inferred preferences, engagement ranking, candidate reputation, or profile completeness. Any future preference update inferred from feedback must be shown as an explicit broad field/tag proposal and applied only after participant confirmation.
- If `interested` and the brief remains valid, create or advance an intro request, but do not disclose counterparty details.
- `interested` feedback must be idempotent for the same requester-owned brief and inherited purpose-code/version pair. Repeated `interested` decisions, retries, duplicate submissions, or replayed requests must not create duplicate intro requests, duplicate receipts, duplicate operator queue items, duplicate candidate budget reservations/counter increments, or duplicate notifications. Return the existing sanitized intro-request state, a generic already-pending state, or a generic conflict without exposing candidate-specific reasons.
- Create a redacted receipt for `intro_request_created` only for the first successful transition from no intro request to intro-request created; replayed/idempotent responses must not create a new receipt unless the repository has a separate redacted duplicate-attempt audit event that is not participant-visible as a fresh intro event.

## `POST /api/background/intro-requests`

Auth required.

Creates a reviewed introduction request.

Requirements:

- Operator queue remains required.
- Contact disclosure requires mutual consent.
- Contact disclosure requires step-up auth if the existing system has step-up auth.
- Intro requests from stale opportunity briefs must be rejected without disclosure.
- Do not accept client-supplied `counterparty_profile_id`, candidate ids, candidate hashes, private cohort ids, contact details, exact target descriptors, exact wish text, or purpose overrides. The request should identify only the requester-owned opportunity brief or receipt and the broad disclosure categories being requested.
- The server must derive the internal counterparty from the valid active opportunity brief after revalidating all inherited hard gates, including candidate exposure, candidate budget/cool-off, retention/anonymization state, emergency controls, runtime tripwires, and stale dependency snapshots.
- Enforce server-side idempotency before allocating any new intro-request row, receipt, budget reservation, operator-review task, or notification. A repeated request for the same requester-owned brief and inherited purpose-code/version pair must return the existing sanitized projection or a generic already-pending/conflict response.
- Duplicate/replayed intro-request attempts must not reveal whether the existing request is blocked, declined, expired, waiting on the counterparty, held for review, or affected by candidate-specific consent, budget, cohort, retention, or privacy-stage gates.
- `purpose_code` and `purpose_policy_version` must be inherited from the valid opportunity brief's snapshots; do not allow free-form purpose overrides or registry-version substitution during intro creation.
- Return only a sanitized requester-facing intro-request projection validated against a versioned allowlist schema. The response must not expose exact counterparty identity, exact candidate-specific gate state, exact operator notes, exact decline/expiry reasons, or exact timing/polling signals before the relevant consent stage.
- Counterparty-facing notification or contact may occur only after operator review determines the request is eligible for the relevant consent step. The counterparty-facing intro-consent notification must be built from the separate sanitized counterparty-facing allowlist schema and must not expose requester exact identity, contact details, exact wishes, source notes, private cohort membership, exact targeting reason, or internal requester/candidate identifiers before a later consent grant permits disclosure.
- Counterparty-facing reminders must be system-controlled, rate-limited, budgeted, generic, and side-channel-safe. The requester must not be able to trigger reminders, inspect reminder delivery/open/click state, or distinguish ignore, timeout, decline, report, cool-off, opt-out, emergency stop, or operator suppression.
- Exact-field disclosure after mutual consent must go through a separate field-level disclosure grant; intro-request creation, counterparty consent, and operator approval must not themselves disclose exact wishes, source notes, contact details, or private constraints.

## `POST /api/background/mediated-contact-sessions`

Auth required. Creates or opens the default post-mutual-consent mediated first-contact session for a valid intro request.

Requirements:

- Require a valid active intro request in `mutual_consent` or repository-equivalent post-review state, all disclosure/contact hard gates, no active privacy freeze/emergency stop/block, a fresh policy decision, and any required operator approval.
- Derive both participants server-side from the intro request. Do not accept counterparty identifiers, external contact handles, private cohort identifiers, or free-form target descriptors from the requester.
- Return only a sanitized session projection with broad purpose, broad allowed message kinds, boundary settings, coarse expiry, no-reason exit controls, and generic relay status. Do not return exact external contact fields, raw source notes, exact wishes, candidate-gate outcomes, message-content telemetry, or hidden blocker reasons.
- Creating a mediated session must not disclose exact contact details or create a field-level disclosure grant. Requests for exact contact information must use the ordinary disclosure-grant flow with explicit field keys.

## `POST /api/background/mediated-contact-sessions/:id/events`

Auth required. Sends a bounded relay event such as a broad intro note, scheduling-intent response, ask-for-field-grant request, pause, close, decline, or block.

Requirements:

- Validate the event kind against the session's allowed message kinds, output schema, queue-freshness controls, attachment/link policy, pairwise safety preferences, freeze/emergency controls, and retention policy.
- Reject attachments, links, external handles, exact locations, exact contact fields, raw source notes, or free-form sensitive fields unless an active policy/action kind and explicit field-level disclosure grant permit them.
- Store and deliver relay content only under the session retention policy; do not copy message content into telemetry, model training, analytics, receipts, public reports, or operator queues except through redacted safety-review paths.
- Decline, pause, close, block, timeout, and no-response states must be generic to the other party and must not become reputation, quality, engagement, or matching signals.

## `POST /api/background/disclosure-grants`

Auth required. Operator-review completion and mutual consent required for creation or widening; auth and grant ownership/recipient checks required for revocation.

Creates, narrows, revokes, or expires a field-level disclosure grant attached to an intro request.

Requirements:

- Use an existing privacy-grant endpoint if present; otherwise implement this route as the only post-mutual-consent exact-field disclosure path for Background Networking.
- Reject grant creation unless the intro request is in the required mutual-consent/operator-approved state, inherits a valid opportunity brief or valid approved-contact state, and all purpose, stale-state, emergency-control, tripwire, retention, and field-eligibility gates pass.
- Accept only explicit allowlisted `granted_field_keys`; reject broad grants such as `all_profile`, raw source exports, unreviewed source notes, hidden model summaries, exact targeting reasons, candidate-dependency snapshots, internal operator notes, or future profile changes.
- Require expiry, revocation controls, redacted grant summary, and a participant-visible receipt. Widening a grant requires fresh explicit consent from the grantor.
- Return only sanitized grant status and granted field categories. Do not return exact field values through this endpoint unless the repository already has a separate exact-field retrieval flow with step-up auth, grant verification, output schemas, and audit logging.
- Revocation or expiry must remove future access, mark dependent disclosure surfaces stale, and schedule retention cleanup without making the underlying intro request or opportunity brief actionable again.

## `GET /api/background/delegate-receipts`

Auth required.

Returns participant-visible, redacted receipts for delegate runs, opportunity-brief creation, stale transitions, and intro-request creation.

Requirements:

- Return only receipts owned by the authenticated participant.
- Do not expose raw source text, exact wishes, exact candidate identity, private cohort membership, prompts, message text, or private notes.
- Provide enough redacted information for the user to understand why a delegate run or opportunity brief exists and which authorization scope it used.
- Hide, delete, or anonymize receipts after their retention window unless a safety-review or legally required hold applies.


## `POST /api/background/privacy-freeze`

Auth required. Step-up authentication required for release or scope narrowing unless the repository has a stronger account-recovery policy.

Creates, scopes, or releases a participant-controlled privacy freeze / panic pause.

Requirements:

- Activation must be available from the Background Delegate dashboard and must not require the participant to explain themselves.
- Activation immediately blocks or pauses in-scope delegate runs, candidate surfacing, outbox sends, counterparty consent prompts, feedback advancement, intro requests, disclosure grants, vault reveals, partner/federation outputs, exports, cached projections, and nonessential operator reveals.
- Activation returns only participant-owned confirmation and generic stale/frozen state. It must not reveal candidate identities, counterparty states, hidden blockers, private cohort membership, or whether specific artifacts existed.
- Requester/counterparty-facing surfaces affected by another participant's freeze must show only generic stale/unavailable/recompute labels.
- Release requires step-up authentication, a fresh policy decision, and revalidation from current inputs. Release must not automatically resume stale briefs, queued notifications, old intros, disclosure grants, exports, or partner/federation outputs.


## `POST /api/background/notification-preferences`

Auth required. Step-up authentication required for adding a new external delivery channel or widening direct-notice delivery where repository policy requires it.

Creates, narrows, pauses, or revokes participant-owned Background Delegate notification preferences.

Requirements:

- Allow participants to choose non-critical digest frequency, channel preferences, quiet hours, maximum non-critical notification volume, and broad critical-notice policy where the repository supports it.
- Preferences may only narrow, batch, pause, or redirect non-critical notifications. They must not force immediate delivery, override fixed digest/jitter rules, increase candidate-specific delivery priority, bypass counterparty notification budgets, or suppress required account-security, legal/safety, privacy-freeze, revocation, retention, or expiry/reconfirmation notices.
- Return only sanitized preference state and generic next steps. Do not return opportunity counts, hidden withheld counts, candidate-specific notification causes, counterparty engagement state, internal policy decisions, or exact timing that could reveal candidate-specific gates.
- Preference changes must invalidate queued/cached notification payloads and produce a redacted receipt without revealing whether specific briefs, counterparties, reminders, or hidden gate outcomes existed.

## `POST /api/background/data-exports`

Auth required. Step-up authentication required where the export includes exact participant-owned vault fields under a separate exact-data export policy.

Creates a sanitized participant-owned background-networking export job.

Requirements:

- Export only the authenticated participant's own contributed profile fields, authorizations, source-summary metadata, confirmed broad tags, candidate-exposure settings, disclosure grants, privacy-freeze records, safety preferences, and redacted receipts.
- Generate the export from versioned sanitized allowlist schemas; extra keys fail closed before file creation, logging, caching, or download.
- Exclude candidate/counterparty identifiers, run-scoped candidate handles, hidden blockers, exact gate outcomes, internal policy decisions, abuse heuristics, rare-combination internals, private cohort membership of others, partner-seat data, raw source text, and third-party private data.
- Revalidate policy at generation and download time. Active privacy freezes, emergency controls, retention cleanup, deletion, output-schema mismatch, or revoked disclosure grants must cancel, stale, or regenerate the export.
- Download links must be short-lived, encrypted, non-indexed, non-analytics, and deleted after expiry.

## `GET /api/background/data-exports/:id`

Auth required.

Returns sanitized status for a participant-owned export job.

Requirements:

- Return only generic job state, export scope label, schema version, expiry, and allowed download action when available.
- Do not return row counts, withheld counts, blocker counts, candidate-specific omission reasons, internal policy decisions, rare-combination internals, or timing details that would disclose another participant's state.


## `POST /api/background/consent-scope-preview`

Return a server-derived, sanitized effective-permission preview for a proposed high-impact Background Delegate change before activation.

- Requires authentication, active output schema, active UI-copy bundle, active phase lane, and a fresh policy decision for preview generation.
- Computes broadening/narrowing from current server state and governed registries; clients must not supply effective-diff labels.
- Must not run matching, estimate candidate availability, reveal candidate existence, produce opportunity predictions, reserve candidate budgets, create receipts/intros, or expose candidate-specific gates.
- Confirmation routes must require the preview id/version when the proposed change broadens scope, releases a freeze, expands notification delivery, creates an intro request, exports data, or grants disclosure.

## `POST /api/background/pairwise-safety-preferences`

Auth required.

Creates, narrows, pauses, revokes, or expires a participant-owned private block, mute, do-not-match, no-reminder, or no-recontact preference.

Requirements:

- This endpoint is a safety/consent endpoint, not a ranking, reputation, or disclosure endpoint.
- Accept only scoped actions the authenticated participant is allowed to set, such as blocking a known post-intro counterparty, muting reminders, or suppressing future surfacing from a known organisation/cohort where product UI supports that scope.
- Do not reveal whether a target profile exists, is active, is in a cohort, has candidate exposure enabled, hit a budget, blocked the requester, or was previously surfaced.
- Creating, narrowing, pausing, revoking, or expiring a preference must update the relevant safety-preference version and mark dependent active briefs, intro requests, reminders, queued notifications, cached projections, exports, and disclosure grants stale or blocked.
- Responses must use a sanitized allowlist schema with generic state labels and must not expose internal profile ids, exact target descriptors, private cohort membership, requester/counterparty identities outside the already-consented context, or candidate-specific gate reasons.

## `POST /api/background/participant-correction-requests`

Auth required.

Creates, updates, or closes a participant-owned correction request for the participant's own background-networking records or generic denial categories.

Requirements:

- This endpoint is a correction/support endpoint, not a matching, candidate-discovery, or disclosure endpoint.
- Accept only targets owned by the authenticated participant, or generic denial categories that do not identify a candidate or counterparty.
- Do not reveal whether a candidate exists, opted out, exhausted a budget, left a cohort, blocked the requester, changed privacy stage, triggered retention/anonymization, or was withheld by any candidate-specific gate.
- Accepted corrections must update the relevant version, remove or stale invalid match-input lineage, and mark dependent active briefs, intro requests, queued notifications, cached projections, exports, receipts, policy decisions, and disclosure grants stale where applicable.
- Responses must use a versioned allowlist schema and may contain only requester-safe status labels and redacted resolution summaries.

## `POST /api/background/high-impact-change-approvals`

Internal/security-owner/operator auth required, with role constraints.

Creates, approves, rejects, revokes, or expires a high-impact change-approval record.

Requirements:

- This endpoint is a governance-control endpoint, not an override endpoint. It must not itself activate matching, create consent, widen exposure, release exact data, or disclose counterparties.
- Enforce separation of duties: where dual control is required, the approver must differ from the proposer/beneficiary and must have the required role for the change kind.
- Missing, expired, wrong-scope, self-approved, or stale approvals fail closed for the dependent high-impact action.
- Responses and logs must be redacted and must not expose exact wishes, source notes, candidate identities, private cohort membership, fraud heuristics, legal strategy, or sensitive admin notes.

## `POST /api/background/delegate-tool-capabilities`

Internal/security-owner auth required.

Creates, disables, or updates a delegate tool-capability registry entry.

Requirements:

- New, network-enabled, write-capable, LLM, partner-callback, or vault-minimum tools require the configured risk-review and high-impact change-approval path before activation.
- Tool capabilities must be scoped to exact action kinds and must fail closed when used by a different route, worker, queue, partner service, or policy-decision action.
- This endpoint must not grant arbitrary browser/fetch/scrape/code-execution, contact/email/calendar write, payment, or vault-decrypt powers to background delegates.
- Responses must be redacted and must not include private prompts, source text, candidate identifiers, partner secrets, or hidden abuse heuristics.


## `POST /api/background/power-asymmetry-reviews`

Internal/operator auth required, with participant-facing consent copy generated only through sanitized schemas.

Creates, updates, expires, or revokes a review for high-dependency or power-asymmetric background-networking contexts.

Requirements:

- This endpoint is a safety gate, not a matching or disclosure endpoint. It must not create consent, widen authorization, widen candidate exposure, surface candidates, send requester-triggered reminders, disclose exact details, or make stale artifacts actionable.
- Require relation type, purpose-code/version, review state, safeguard codes, expiry, redacted summary, and a policy-decision record.
- Pending, blocked, expired, revoked, wrong-purpose, wrong-scope, or missing required reviews must block opportunity creation, intro advancement, counterparty-facing prompts, reminders, and disclosure where configured.
- Responses must be redacted and must not expose exact wishes, source notes, candidate identities, private cohort membership, requester/counterparty identifiers, hidden vulnerabilities, or sensitive reviewer notes.

## `POST /api/background/claim-assurance-records`

Internal/operator, participant-owned verification, or repository-standard evidence-review auth required depending on claim kind.

Requirements:

- This endpoint records assurance for high-impact broad claims; it must not create consent, widen exposure, surface candidates, send notifications, disclose exact details, or make stale artifacts actionable.
- It must validate claim kind, broad claim key, purpose-code/version bindings, allowed surfaces, evidence state, assurance level, expiry, and redacted evidence summary.
- Evidence payloads must remain vault-bound or in the repository's sensitive evidence-review system; requester/counterparty responses may show only generic assurance labels where the purpose and disclosure stage allow it.
- Expiry, revocation, rejection, or assurance-level reduction must mark dependent match-input lineage, briefs, intro requests, policy decisions, caches, exports, and disclosure grants stale where applicable.

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
- Any operator field reveal must be separate from ordinary admin action creation, field-scoped, reason-coded, role-limited, time-bounded, and audited. The admin-safety endpoint must not become a bulk export, search, or browsing surface for exact wishes, source notes, contact details, candidate identifiers, exact targeting reasons, or internal dependency snapshots.



## `POST /api/background/federation-bridge-grants`

Internal/operator auth and configured dual-control approval required.

Requirements:

- This endpoint creates, pauses, revokes, or expires named federation / cross-platform bridge grants only; it must not export data, create consent, widen authorization, widen candidate exposure, surface candidates, send notifications, disclose details, or make stale artifacts actionable.
- It must require exact purpose-code/version, counterparty system reference, surfaces, schema versions, data direction, risk review, pilot-evaluation record, aggregate-release control where needed, expiry, and revocation path.
- Raw source text, exact wishes, internal rows, active candidate identifiers, dependency snapshots, exact blocker states, exact timing, and reusable candidate-specific profile exports are forbidden unless a separate future privacy review explicitly supersedes this spec.

## `POST /api/background/reviewer-conflict-recusal-records`

Internal/operator or governance auth required.

Requirements:

- Records conflict checks, recusals, policy waivers, and replacement reviewer assignment for high-impact review paths.
- This endpoint must not approve the underlying review target, disclose details, alter matching, or make stale artifacts actionable.
- Responses and summaries must be redacted and must not reveal exact wishes, source notes, candidate identities, private cohort membership, legal strategy, or hidden abuse heuristics.

## `POST /api/background/pilot-evaluation-reviews`

Internal/operator or governance-review auth required.

Requirements:

- This endpoint governs launch evaluation only; it must not create consent, widen authorization, widen candidate exposure, surface candidates, send notifications, create intro requests, disclose details, unredact artifacts, or make stale artifacts actionable.
- Require exact purpose-code/version, surfaces, audience/cohort scope, notification path, retention class, output-schema versions, success metrics, harm metrics, pilot window, sunset/rollback rule, owner, expiry, and adversarial safety-case status.
- `approved_to_promote` is rejected unless all pre-registered required checks pass, any required independent adversarial safety-case is current and passed, no active emergency stop/tripwire/hold blocks the lane, conflict checks pass, and two-person governance approval is satisfied where configured.
- Release, approval, or sunset must not automatically resume stale artifacts; promotion requires recomputation from currently valid inputs and fresh policy decisions.

## `POST /api/background/backup-retention-manifests`

Internal infrastructure/legal-owner auth required.

Requirements:

- Records backup, snapshot, restore, deletion-manifest, and destruction state for background-networking artifacts.
- This endpoint must not restore data into active matching, notifications, intro requests, disclosure grants, analytics, or search indexes until restore safety checks and deletion/redaction/anonymization replay pass.
- Responses must be redacted and must not expose exact wishes, raw source text, candidate identities, prompts, message text, private cohort membership, or legal strategy.

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

- The active route/worker/action is covered by a current approved release/config manifest whose governed-artifact versions match the policy decision, output schema, migrations, tool capabilities, and environment.
- `participant.opt_in_status == active`.
- A referenced delegate authorization is active, unexpired, unrevoked, server-confirmed within the repository-defined maximum duration / renewal window, and owned by the participant.
- The run specifies exactly one allowlisted `{purpose_code, purpose_policy_version}` pair from the authorization's per-purpose bindings and stays inside the authorization’s allowed purpose codes, allowed purpose-policy bindings, allowed surfaces, audience/cohort scope, maximum candidates, maximum briefs, and minimum confidence band.
- For non-staff or external-pilot contexts, the run is covered by a current approved risk review for the exact purpose code, purpose-policy version, surfaces, and audience/cohort scope.
- For non-staff, external-pilot, partner, federation, high-sensitivity, high-impact-claim, or public-broad-preview contexts, the lane is covered by a current approved pilot-evaluation / adversarial safety-case record for the exact purpose code, purpose-policy version, surfaces, audience/cohort scope, output schemas, rollout stage, and any partner/federation grant; required shadow/canary checks and independent adversarial review are current and passed.
- No active emergency stop applies to the global system, selected purpose code, purpose-policy version, selected surfaces, audience/cohort scope, notification path, LLM mode, or relevant retention class. Active emergency controls are hard blockers before run creation, scoring, notification, opportunity-brief creation, feedback advancement, candidate-facing exposure, or intro-request creation.
- No active blocking runtime safety tripwire applies to the selected purpose code, purpose-policy version, surfaces, audience/cohort scope, notification path, LLM mode, retention class, explicit-signal path, or relevant hard-gate family. Blocking tripwires are hard blockers before run creation, scoring, notification, opportunity-brief creation, feedback advancement, candidate-facing exposure, or intro-request creation. Any active tripwire that was triggered only by user-controllable aggregate signals must also satisfy its anti-DoS corroboration and maximum-scope rules before it can create a broad emergency stop; otherwise it may only trigger review, narrow throttling, or the smallest affected-lane pause.
- No operator/admin action, feature flag, fixture, or break-glass state claims to waive any non-waivable gate. Operator/admin actions may only narrow, suppress, quarantine, mark stale, or approve a next step after all hard gates pass.
- Any high-impact governance/safety dependency for the action has a current valid separation-of-duties approval record where required; missing, stale, self-approved, wrong-role, wrong-scope, or expired approval fails closed.
- The delegate run or worker has a current tool-capability manifest for the exact action kind, and no unregistered, disabled, wrong-purpose, write-capable, network-enabled, partner, LLM, or vault-minimum tool is invoked outside that manifest.
- Any high-impact participant action that created or changed the relevant authorization, exposure, budget, sensitive signal, vault reveal, disclosure grant, or collective authority has a current step-up authentication / comprehension event and is not blocked by an active account-security hold.
- A fresh server-generated `allow` policy-decision record exists for the exact action being performed, under the current policy-engine version, output-schema version, purpose-code/version, dependency snapshots, active stop/tripwire/hold state, vault key state, and disclosure-grant state where applicable. Missing, stale, wrong-action, client-supplied, or expired policy decisions are hard blockers.
- The participant's profile version is current and `last_confirmed_at` is inside the repository-defined freshness window, unless the participant has explicitly marked the relevant fields current for this run.
- The authorized search pool passes the repository-defined minimum eligible-pool floor before candidate scoring. Use a default floor of at least 5 eligible broad-preview candidates unless the repository already has a stricter anti-enumeration constant.
- The complete requester/counterparty-visible output candidate passes the quasi-identifier / rare-combination check for the applicable safe pool; otherwise the system must coarsen, withhold, delay, or suppress the brief/prompt even if the underlying score is high.
- Candidate profile is currently active, not paused, not deleted, and discoverable at `broad_preview` or compatible privacy stage.
- Requester and candidate subject-identity profiles are current, non-deceptive, and compatible with the selected purpose/surface. Non-human, automated, organisational, collective, service-account, or partner/operator subjects have current authority, accountability owner, and sanitized disclosure labels for the lane.
- Candidate-side `inbound_delegate_discovery`, `inbound_delegate_purpose_codes`, `inbound_delegate_purpose_bindings`, `inbound_delegate_surfaces`, `allowed_cohort_ids`, `candidate_exposure_version`, `inbound_delegate_confirmed_at`, and `inbound_delegate_expires_at` authorize this requesting delegate's selected purpose code, selected purpose-policy version, audience scope, cohort, and allowed surfaces, and the confirmation is unexpired under the repository-defined freshness window.
- Candidate-side surfacing budget, pending-intro budget, cool-off state, and `candidate_inbound_budget_version` authorize another surfacing or intro path for this selected purpose, audience scope, and cohort. Exhausted budgets, missing required budget settings, stale budget versions, or active cool-offs are hard blockers.
- Candidate-side budget authorization and counter reservation/increment succeed atomically for this surfacing or intro path. If the atomic budget update fails, races, conflicts, or detects a stale counter version, the candidate is treated as budget-blocked with no opportunity-brief creation and no notification.
- Candidate is inside the authorized cohort, named partner-matchmaker grant, or public-broad-preview scope explicitly allowed for this run.
- Candidate identity, organization, or collective resolution is confirmed for this lane through self-claim, independent verification, or operator-confirmed resolution. Imported aliases, model-suggested duplicates, partner-attested-but-unconfirmed identities, ambiguous organization links, or disputed/stale resolution claims are hard blockers.
- If the run uses a partner-matchmaker scope, the named partner grant is active, purpose-compatible, surface-compatible, quota-compatible, and explicitly allowed by both requester authorization and candidate exposure.
- If either side is a collective profile, the relevant collective representative authority is current for the selected purpose, surface, and scope, and no private member-level data is being used without that member's independent confirmation.
- Candidate is not the same participant.
- No stated exclusion conflict.
- No safety/prohibited-pattern blocker.
- No prohibited-coordination blocker, including collusion, price-fixing, fraud, harassment, intimidation, doxxing, extortion, sanctions evasion, or coercion.
- No unresolved required power-asymmetry or dependency-safety review. High-dependency contexts such as funder/grantee, employer/applicant, clinician/client, legal or immigration adviser/client, landlord/tenant, mentor/mentee, platform admin/user, or regulator/regulated-party relations pass their configured safeguards before opportunity creation, intro advancement, counterparty prompts, reminders, or disclosure.
- No sparse-search, anti-enumeration, cross-route probing-budget, abuse-principal probing-budget, or side-channel blocker.
- Privacy stages are compatible.
- Both sides’ broad signals are within retention and revocation constraints.
- Every match input is an explicit, participant-visible, schema-bound field or confirmed broad tag with a current signal-taxonomy entry; hidden embeddings, latent vectors, unreviewed model summaries, private source-derived representations, uninspectable features, unclassified fields, deprecated taxonomy entries, or purpose/surface-incompatible sensitivity classifications are hard blockers.
- Every match input has an active match-input lineage record tying it to a current confirmation event, source/profile version, taxonomy version, purpose binding, retention window, and revocation state. Missing, stale, orphaned, client-supplied, or retention-expired lineage is a hard blocker.
- High-sensitivity or vulnerability-like signals pass their taxonomy-defined confirmation, purpose, risk-review, generic-output, and operator-review requirements before they can affect matching; they cannot create positive score or priority merely because they reveal urgency, dependency, distress, or exploitability.
- No match input is derived from passive behavioral feedback unless the relevant person explicitly confirmed the resulting broad field or tag. Requester, candidate, and counterparty views, dismissals, deferrals, accepts, declines, ignores, timeouts, reports, request-more-context actions, clicks, dwell time, intro requests, budget/exposure pauses, notification interactions, and receipt interactions are not match inputs by themselves.
- No match input is derived from private third-party data supplied by someone other than the person being represented. Third-party wishes, constraints, capabilities, vulnerabilities, affiliations, contact details, or strategy can influence discovery only through that third party's own independently confirmed profile and exposure settings.
- Any source-summary or interview-derived field used for positive scoring is explicitly confirmed, not merely uncertain or machine-proposed.
- The candidate has not been repeatedly surfaced to this participant, partner workflow, or materially equivalent requester cluster through materially equivalent query/profile variants beyond the repository’s dedupe window.
- Candidate/requester/counterparty is not blocked, muted, do-not-match, no-reminder, or no-recontact under an active in-scope `background_pairwise_safety_preference`.
- Candidate is not within a cool-off window from prior dismissal, report, or operator block.
- The relevant run, source summary, opportunity brief, receipt, backup/restore manifest, and any non-surfaced candidate-evaluation artifacts are inside their retention windows and are not already anonymized. Artifacts retained only because of an active retention hold must not be used for matching, notifications, feedback advancement, intro requests, disclosure grants, or opportunity-brief creation; they are available only for the hold's stated safety/legal review purpose.

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

Where `anyHardBlocker01` must include prohibited-coordination blockers, purpose-mismatch or purpose-policy-version blockers, missing/expired/revoked/wrong-scope risk-review blockers for external use, missing/stale/wrong-scope release-manifest blockers, active emergency-stop blockers, active blocking runtime-tripwire blockers, authorization-scope violations, candidate-exposure violations, expired/stale candidate-exposure confirmations, candidate-side budget exhaustion, stale/non-atomic budget counter updates, or cool-off states, candidate opt-out/pause/delete states, privacy-stage violations, sparse-search or minimum-pool blockers, repeated-probe or cross-account anti-probing blockers, missing/expired/revoked/wrong-scope partner-matchmaker grants, invalid collective representative authority, deceptive/stale/wrong-scope subject identity or automation-disclosure blockers, unresolved required power-asymmetry/dependency review blockers, payment/partner-priority influence attempts, stale dependency snapshots, retention-expired, retention-held-only, wrong-retention-policy-bundle, or anonymized artifacts, revoked-source influence, unconfirmed uncertainty driving positive score, hidden embedding or latent-vector influence, operator/admin override attempts, missing/stale/wrong-action policy decisions, policy-composition conflicts or least-permissive intersection failures, invalid/unknown/forbidden artifact state transitions, missing/failed/wrong-scope pilot-evaluation or adversarial safety-case records, under-assured high-impact claims, federation-bridge violations, conflict-of-interest/recusal blockers, vault-boundary violations, backup/restore retention violations, aggregate-release-control violations where the action is an aggregate release, and safety/operator blocks. A hard blocker must suppress opportunity creation regardless of score.

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
- quasi-identifier redaction state, shown only as generic `some details withheld for privacy` language where needed
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
- rare combinations of broad fields, cohort labels, purpose labels, factor codes, timing, or provenance labels that can identify a candidate inside the safe pool
- candidate-specific blocker reasons such as opt-out, exposure mismatch, budget exhaustion, cool-off, cohort membership, privacy-stage conflict, retention/anonymization state, prior dismissal/report, block/mute/do-not-match state, or third-party-data block
- high-sensitivity or vulnerability-like signals except as generic broad categories explicitly allowed by the signal taxonomy and current consent stage

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

Notification delivery must respect participant-owned notification preferences for non-critical notifications: digest frequency, quiet hours, channel preferences, and maximum non-critical volume. These preferences may only narrow or batch delivery. They must not force immediate candidate-specific notifications, reveal no-result or withheld timing, override fixed digest/jitter rules, bypass counterparty notification budgets, or suppress required account-security, privacy-freeze, revocation, retention, legal/safety, or expiry/reconfirmation notices.

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
- Background-networking prompts, source-summary text, proposals, confirmations, feedback, operator decisions, and intro outcomes must not be used to train, fine-tune, evaluate, or personalize LLMs or embedding models unless a separate explicit opt-in and risk-reviewed research path authorizes a narrow synthetic/redacted use; any such output remains proposal-only until explicitly confirmed by the participant.
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

Add or update a Background Delegate dashboard surface as a task-based participant control center. Every panel must render from sanitized server-side screen-state DTOs or repository-equivalent projections, not from direct internal-row reads or client-inferred feature flags. The UI should make the safe mental model legible: Background Delegate creates privacy-safe opportunity briefs, not introductions; outbound delegate authorization and inbound candidate exposure are separate; exact details move only after mutual consent and field-level grants; and all high-impact choices can be paused, revoked, frozen, or allowed to expire.

## 0. Plain-language default and technical details

Use plain-language, action-oriented terms by default, while preserving the exact underlying controls and safety gates. The default participant-facing UI should map implementation terms as follows unless the active UI-copy bundle supplies safer locale-specific wording:

- `delegate authorization` → “Find opportunities for me”
- `candidate exposure` / `inbound delegate discovery` → “Let others find me”
- `wish profile` / `confirmed broad signals` → “What it can use”
- `purpose code` → “What kind of opportunity”
- `audience/cohort scope` → “Where it can look”
- `opportunity brief` → “Possible opportunity”
- `intro request` → “Ask to explore”
- `field-level disclosure grant` → “Share exact details”
- `privacy freeze` → “Pause everything now”
- `delegate receipt` → “Activity receipt”
- `stale`, `blocked`, `future phase`, or `unavailable` internal states → generic “Not available right now” / “Needs review” / “Paused” labels where appropriate

Implementation terms such as policy decision, manifest, bundle hash, candidate handle, retention hold, artifact transition, rare-combination check, and anti-probing gate should appear only in an explicit “Technical details” view or operator/admin surfaces. The technical-detail view must be generated from sanitized server-side DTOs, must not expose candidate-specific gates or hidden abuse logic, and must not be required for ordinary users to complete a safe action.

Each high-impact participant decision should follow this repeated structure:

1. **What happens** — what data may be used or shared, for which opportunity type, and by which audience/scope.
2. **What stays hidden** — exact details, counterparties, source notes, contact details, hidden gates, and other protected categories that remain hidden unless later consent permits them.
3. **How to stop or change it** — expiry, revocation, pause, narrowing, privacy-freeze, correction/export, and what revocation can and cannot undo.

## 1. Guided onboarding / current phase

Include:

- current implementation phase and enabled, staff-only, disabled, and future-phase surfaces using server-derived generic labels
- progressive-disclosure layout: simple safe path first, advanced settings behind explicit advanced controls, and no need for ordinary users to inspect governed-artifact hashes or internal policy jargon
- one-sentence statement of what Background Delegate does and does not do
- explicit separation of outbound delegate authorization, inbound candidate exposure, source-summary review, opportunity briefs, intro requests, and disclosure grants
- default-off choices for outbound and inbound lanes; no “enable all” shortcut
- a one-page setup path that asks six simple questions before advanced controls: what can it use, what kind of opportunity should it look for, where can it look, who may see a broad preview, how often should it run or notify, and when should this permission end
- privacy-impact summary for each lane: data used, audience/scope, purpose code/version, expiry/reconfirmation, revocation effect, and hidden data categories
- server-derived before/after effective-permission preview before any enablement or scope broadening
- clear links to pause, revoke, privacy freeze, receipts, data export, notification preferences, and correction request flows

## 2. Delegate status and controls

Include:

- opt in / pause / disable / privacy freeze
- active delegate authorization summary
- inbound candidate-exposure status, exposure expiry / re-confirmation deadline, budget status, pending-intro limit, cool-off state, and controls for this user's own profile
- allowed purpose codes, allowed surfaces, and audience/cohort scope
- maximum runs / briefs / candidates and expiry window
- revoke authorization
- renew or narrow authorization
- last helper run
- next scheduled digest
- rate-limit, anti-probing, stale-brief, or privacy-gate status using generic non-enumerating labels
- recent redacted delegate receipts
- notification/digest preferences, quiet hours, and maximum non-critical notification volume
- artifact retention and cleanup status for runs, briefs, feedback, intro requests, and receipts

## 3. Wish profile composer

Include:

- structured fields
- optional fluent interview if enabled
- preview of broad fields
- signal-taxonomy sensitivity labels for proposed broad fields/tags
- explicit **Apply** button
- explicit “do not use this for matching” draft state
- confirmation that more private detail does not improve score once signal sufficiency is reached
- visible privacy-impact summary and effective-permission preview before any field becomes a match input

## 4. Source-summary review

Include:

- add manual source summary
- review derived broad tags
- distinguish summary approval from tag confirmation
- classify each proposed tag as about the participant, about a third party, non-sensitive public context, or blocked/needs redaction
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
- visible explanation that approving a summary does not make proposed tags matchable

## 5. Opportunity inbox and opportunity detail

Include:

- list opportunity briefs
- confidence band and factor codes
- redacted fields
- statement that a brief is not an introduction
- generic explanation of what is hidden before consent
- dependency-state label and stale-recompute notice when relevant
- receipt id / receipt detail link
- dismiss
- maybe later
- report
- create private do-not-match / block / mute where product scope supports it
- request intro
- safe undo or reversal for dismiss/defer/report where product policy allows and where reversal does not disclose counterparties, create consent, or resurrect stale artifacts
- no urgency, scarcity, popularity, or engagement-optimized prompts

## 6. Intro, disclosure, receipts, export, correction, and freeze

Include:

- intro-request status using generic labels such as `operator_review`, `counterparty_pending`, `mutual_consent`, `declined_or_unavailable`, or `closed`
- counterparty prompt view with broad purpose, broad requested disclosure categories, generic review state, coarse expiry/review window, and choices to review, decline, or ask for more context
- field-level disclosure grant review with exact field keys, recipient, purpose, expiry, retention policy, and revocation effect
- receipt timeline for opt-in, authorization, exposure, source-summary approval, tag confirmation, delegate runs, opportunity creation, stale transitions, feedback advancement, intro-request creation, disclosure grants, exports, freezes, revocations, operator/vault reveal records where safely visible, delayed/internal-only receipt states, and retention cleanup
- participant data export screen using sanitized export scopes and short-lived download state
- correction/appeal flow for the participant's own records with no candidate-specific blocker disclosure
- one-action privacy freeze / panic pause that is visible from every high-impact screen

## 7. Permission previews, notifications, and safe recovery

Include:

- server-derived effective-permission before/after previews for all enablement or scope-broadening actions
- generic data-use, audience/scope, surface, expiry, revocation, and hidden-data deltas, not internal policy traces
- explicit cancel/back paths before high-impact confirmation
- safe undo or reversal for non-disclosing actions where product policy allows and where reversal does not create consent, resurrect stale artifacts, disclose counterparties, or bypass revalidation
- notification/digest preferences for non-critical Background Delegate updates
- quiet hours, maximum non-critical notification volume, and channel preferences
- no notification-opening incentives, streaks, popularity cues, or engagement-optimized reminders

---

# Accessibility

All enabled dashboard flows must satisfy repository-standard WCAG 2.2 AA-or-better checks and be keyboard navigable, screen-reader labelled, localization-safe, and resilient on mobile and low-bandwidth connections. At minimum this includes:

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
- screen-state unavailable/stale/frozen labels
- privacy-impact summaries and receipt timelines
- effective-permission before/after previews
- notification-preference controls and quiet-hour forms
- visible focus states and non-color-only status labels
- reduced-motion support and no flashing/animation-dependent consent cues
- touch/mobile layouts with non-tiny destructive controls
- locale-aware dates, times, retention windows, and expiry/reconfirmation copy
- plain-language consent-critical copy and understandable error recovery
- low-bandwidth fallback for control-center, receipt, freeze, and revocation flows

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
- `background_high_impact_change_approval_created`
- `background_high_impact_change_approval_approved`
- `background_delegate_tool_capability_blocked`
- `background_account_security_hold_activated`
- `background_participant_correction_request_created`
- `background_participant_correction_request_resolved`
- `background_disclosure_grant_created`
- `background_disclosure_grant_revoked`
- `background_disclosure_grant_expired`
- `background_operator_field_reveal_created`
- `background_counterparty_intro_reminder_suppressed`

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
- disclosure-grant state and broad granted-field category counts only, never exact granted values
- operator field-reveal broad category only when internal service/safety telemetry, never requester-visible or exportable
- retention-state label
- candidate budget-state label only in candidate-owned views or internal service/safety telemetry; requester-visible, exportable, or public surfaces may use only generic availability/budget categories that are bucketed, withheld, or aggregated over a sufficiently broad safe pool
- release/config manifest id or public release channel, where non-sensitive and not useful for probing
- eligible-pool-size bucket, never exact sparse pool size

## Forbidden telemetry

- session replay, heatmaps, full DOM snapshots, screenshots, screen recordings, keystroke logs, mouse/scroll paths, rage-click traces, full URL/query-string histories, third-party analytics pixels, or behavioral A/B-treatment logs from Background Delegate surfaces
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
- run-scoped candidate handles or identity-resolution mapping data
- model-training, fine-tuning, personalization, ad-targeting, growth-ranking, or engagement-optimization feature labels derived from background-networking data
- participant export omission reasons, exact export row counts, candidate-specific omission counts, or export timing signals that could reveal another participant's state
- emergency-control sensitive details, hidden abuse heuristics, and private incident-response notes
- runtime-tripwire sensitive details, exact trigger payloads, hidden abuse heuristics, and private incident-response notes
- free-text purpose descriptions when sensitive
- deprecated or internal-only purpose registry notes
- receipt hashes when linkable to private events outside participant-facing receipt UI
- exact private cohort membership when sensitive
- counterparty-specific sensitive details
- exact subject-identity authority details, staff names, service-account identifiers, partner-seat ids, or power-asymmetry reviewer notes before the relevant disclosure stage
- candidate-specific budget-state labels such as `clear`, `near_limit`, `exhausted`, or `cooloff` in requester-visible, exportable, or public telemetry unless they are mapped to generic availability/budget categories and aggregated over a sufficiently broad safe pool
- match-input lineage internals, confirmation-event ids, entity-resolution status, alias evidence, duplicate-profile links, identity confidence, or high-impact consent comprehension payloads in requester-visible, exportable, public, or ordinary analytics telemetry
- rare-combination / quasi-identifier payloads or exact safe-pool uniqueness diagnostics outside service-side safety tables
- exact no-result, no-brief, withheld, low-confidence, blocked-run, digest-delta, receipt-sequence, queue-timing, retry-timing, or notification-absence signals that could let a requester infer candidate existence or candidate-specific gate outcomes
- non-surfaced candidate evaluation traces, rejected-candidate lists, near-miss scores, per-candidate factor vectors, claim evidence payloads, federation bridge payloads, conflict-recusal details, pilot-evaluation raw data, or backup/restore manifest details that could identify participants, candidates, or private cohorts
- raw tool execution traces, partner secrets, browser/fetch payloads, account-security device fingerprints, account-takeover heuristics, step-up challenge details, high-impact approval internal notes, or participant correction free text outside the participant-owned/support context
- unapproved aggregate analytics queries, sparse-cohort releases, repeated differencing reports, notebook extracts, or partner/public metrics that bypass aggregate-release controls
- block/mute/do-not-match targets, exact safety-preference scope, exact block reason, or any requester-visible signal that a specific participant blocked or muted another participant
- high-sensitivity/vulnerability-like signal values, exact taxonomy rationale, or raw sensitivity-review notes
- production background-networking rows, replay logs, screenshots, fixtures, model-eval examples, or staging/dev/CI clones containing real candidate identifiers, exact wishes, source notes, sensitive constraints, private cohort membership, or active disclosure-grant data
- raw IP addresses, device fingerprints, user-agent strings, cross-account linkage details, or abuse-principal identifiers in requester-visible, exportable, or public telemetry; anti-probing systems may use repository-standard abuse metadata only in redacted/internal safety tables with short retention
- exact disclosure-grant field values, full grant payloads, operator reveal payloads, operator notes, reminder delivery/open/click state, or counterparty intro-reminder timing state
- raw or linkable behavioral histories, dwell-time streams, click paths, notification-open histories, per-candidate feedback sequences, counterparty accept/decline/ignore/request-more-context histories, budget/exposure-pause histories, or unconfirmed inferred preferences derived from feedback/action events
- counterparty-facing intro-consent payloads that reveal requester exact identity, contact details, exact wishes, source notes, private cohort membership, exact targeting reason, requester source-summary dependencies, or internal requester/candidate identifiers before mutual consent


## Aggregate analytics release requirements

- Internal dashboards, partner reports, public reports, scheduled metric exports, research extracts, and measurement notebooks must use `background_aggregate_release_controls` or an equivalent privacy-governed aggregate-release layer.
- Sparse cohorts, exact gate counts, exact timing distributions, repeated deltas, candidate-specific budget/exposure states, block/mute states, and high-sensitivity/vulnerability-like signal categories must be suppressed, bucketed, or noised before aggregate release.
- Telemetry builders and analytics jobs must validate output against versioned allowlist schemas before logging, export, dashboard rendering, notebook access, or partner delivery.
- Ad-hoc analyst access to internal rows, vault artifacts, candidate identifiers, exact blocker states, exact timing, dependency snapshots, or operator-reveal logs is forbidden outside a scoped incident/legal process.

---

# Testing requirements

Add or update tests. At minimum:


## `background-release-manifest-provenance.test.ts`

Verify:

- every policy decision, route response, worker action, outbox send, export, telemetry event, retention cleanup, and partner callback references a current approved release/config manifest
- stale, revoked, wrong-environment, wrong-scope, wrong-policy-engine, wrong-governed-bundle-canonicalization-profile-version/hash, wrong-purpose-registry-version, wrong-purpose-registry-hash, wrong-signal-taxonomy-version, wrong-signal-taxonomy-hash, wrong-claim-assurance-taxonomy-version, wrong-claim-assurance-taxonomy-hash, wrong-retention-policy-bundle-version, wrong-retention-policy-bundle-hash, wrong-aggregate-release-policy-version/hash, wrong-policy-composition-bundle-version/hash, wrong-artifact-transition-policy-bundle-version/hash, wrong-schema-bundle-version, wrong-schema-bundle-hash, wrong-UI-copy-bundle-version/hash, wrong-client-surface-integrity-policy-version/hash, wrong-tool-capability-bundle-version, wrong-tool-capability-bundle-hash, or wrong-migration manifests fail closed
- rollback manifests cannot resurrect deprecated purpose semantics, disabled tools, retired schemas, stale risk reviews, expired feature flags, or anonymized identifiers
- manifest-contract tests compare governed-artifact versions and content hashes, including governed-bundle canonicalization profile version/hash, purpose-registry version/hash, signal-taxonomy version/hash, claim-assurance taxonomy version/hash, retention-policy bundle version/hash, aggregate-release policy version/hash, policy-composition bundle version/hash, artifact-transition bundle version/hash, output-schema bundle version/hash, UI-copy bundle version/hash, client-surface integrity policy version/hash, and tool-capability bundle version/hash, against route contracts, validators, output schemas, worker config, retention jobs, policy-decision fixtures, and public docs


## `background-governed-bundle-canonicalization.test.ts`

Verify:

- the active release/config manifest binds `governed_bundle_canonicalization_profile_version` and `governed_bundle_canonicalization_profile_hash`
- every manifest-bound governed bundle hash is recomputed under the same active canonicalization profile in route handlers, workers, CI, migrations, admin tools, and policy-decision fixtures
- row selection, environment/scope/status filters, included fields, array ordering, null/empty/default handling, timestamp precision, number/boolean encoding, Unicode normalization, and materialization queries are deterministic and test-covered
- same-version mutation, partial materialization, stale canonicalization profiles, non-deterministic serialization, client/operator-supplied hashes, wrong-profile hashes, or hash mismatches fail closed before promotion


## `background-ui-copy-bundle-integrity.test.ts`

Verify:

- the active release/config manifest binds both `ui_copy_bundle_version` and `ui_copy_bundle_hash`
- every consent dialog, privacy-impact summary, effective-permission preview, notification, receipt, unavailable-state label, opportunity card, intro prompt, counterparty prompt, accessibility label, localization file, and public-contract copy path uses an active copy record from that exact bundle version/hash
- CI recomputes the canonical UI-copy bundle hash and detects same-version mutation, stale docs, orphaned tests, missing locale coverage, prohibited-copy patterns, client/CMS copy overrides, and copy-bundle hash mismatches
- high-impact UI-copy changes that alter consent semantics, notification pressure, privacy-impact elements, unavailable-state wording, accessibility/localization status, or screen/action/audience bindings require a new copy bundle version/hash and governed manifest activation

## `background-ui-safety-comprehension-review.test.ts`

Verify:

- enabled non-staff, partner-facing, public-broad-preview, high-sensitivity, high-impact-claim, disclosure, vault-reveal, source-summary, intro, export, and privacy-freeze-release screens require a current UI-safety/comprehension review for the exact phase, lane, screen set, output-schema bundle, UI-copy bundle, locale set, audience scope, and high-impact action family
- reviews use only synthetic or formally redacted scenarios and contain pre-registered false-belief thresholds for outbound/inbound permission split, match-input confirmation, source-summary approval versus tag confirmation, opportunity brief versus introduction, mutual consent versus field-level disclosure, revocation limits, no autonomous outreach, and no raw-feed mining where relevant
- missing, expired, failed, wrong-lane, wrong-locale, wrong-copy-bundle, wrong-output-schema-bundle, or unresolved-critical review records fail closed for promotion and for the affected screen/action
- Background Delegate routes, dashboard screens, notification links, export pages, consent dialogs, opportunity cards, intro prompts, receipt views, and freeze flows do not load third-party analytics, session replay, heatmaps, full DOM/screenshot capture, keystroke logging, mouse/scroll path tracking, or full-page behavioral payloads
- privacy-freeze activation is visible from every Background Delegate screen, low-friction, generic, non-disclosing, and does not require step-up authentication, reason text, or support contact; release or narrowing still requires step-up authentication and fresh revalidation

## `background-client-surface-integrity.test.ts`

Verify:

- enabled Background Delegate routes, dashboard panels, notification links, export pages, receipt views, consent dialogs, opportunity cards, intro prompts, and UI hydration paths reference the active `client_surface_integrity_policy_version` and `client_surface_integrity_policy_hash` where applicable
- sensitive screens set repository-approved CSP, referrer policy, frame/iframe restrictions, cache headers, and service-worker/browser-storage restrictions
- participant ids, candidate handles, intro ids, disclosure-grant ids, consent states, gate labels, exact field keys, or candidate-specific state do not appear in URLs, query strings, browser history, referrers, debug parameters, third-party requests, or persistent client storage
- third-party scripts/resources, iframes, fonts, pixels, service-worker persistence, or cross-origin requests fail closed unless exactly allowlisted in the active policy bundle and covered by security/privacy review

## `background-synthetic-preview-isolation.test.ts`

Verify:

- onboarding examples, synthetic previews, dry-run screens, demos, and comprehension-review tasks use synthetic or formally redacted fixtures only
- synthetic previews are clearly labelled as examples and cannot query live candidate pools, inspect live cohort sizes, sample real blocker/timing distributions, reserve candidate budgets, create opportunity briefs, create receipts that look like real matching receipts, or emit policy side effects
- no-result, timing, count, cohort, or factor labels in synthetic previews cannot be compared with live outputs to infer whether real counterparties exist


## `background-output-schema-bundle-integrity.test.ts`

Verify:

- the active release/config manifest binds both `output_schema_bundle_version` and `output_schema_bundle_hash`
- every requester-facing, counterparty-facing, participant-export, partner-facing, telemetry, cache, UI-hydration, aggregate-report, and public-contract payload uses an active schema record from that exact bundle version/hash
- CI recomputes the canonical output-schema bundle hash and detects same-version in-place mutation, partial schema materialization, stale schema rows, orphaned tests, stale docs, and schema-hash mismatches
- extra keys, internal row fields, debug metadata, candidate identifiers, candidate-specific gate outcomes, dependency snapshots, exact timing fields, vault fields, raw source text, and forbidden key patterns are rejected or blocked before logging, caching, telemetry, export, render, or network response
- adding a visible key, weakening redaction/bucketing/suppression, widening audience or lane bindings, or changing extra-key policy requires a new schema bundle version/hash, privacy review, and governed manifest activation

## `background-tool-capability-bundle-integrity.test.ts`

Verify:

- the active release/config manifest binds both `tool_capability_bundle_version` and `tool_capability_bundle_hash`
- every delegate run, worker, queue consumer, LLM proposal path, notification builder, partner callback, vault path, telemetry builder, export path, and retention job uses only active capability records from that exact bundle version/hash
- CI recomputes the canonical tool-capability bundle hash and detects same-version in-place mutation, partial capability materialization, stale capability rows, orphaned tests, stale docs, and capability-hash mismatches
- unregistered tools, arbitrary outbound network access, unapproved write access, unapproved vault decrypt, overbroad input-data classes, wrong action kinds, wrong lane kinds, and missing risk reviews fail closed before tool execution
- adding a tool, widening action/surface/lane capability, enabling network/write/vault access, raising input-data class, or weakening risk-review requirements requires a new tool-capability bundle version/hash, security or privacy review where applicable, and governed manifest activation

## `background-subject-identity-and-automation.test.ts`

Verify:

- individual, organisation, collective, automated-agent, service-account, and partner/operator subjects are classified through current subject-identity records
- automated, organisational, service-account, partner/operator, or collective subjects cannot masquerade as ordinary individuals
- non-individual or automated subjects require current authority, human accountable owner, scope, expiry, and sanitized disclosure labels before scoring, surfacing, counterparty prompting, intro advancement, or disclosure
- exact organisation names, staff names, partner-seat ids, service-account ids, and contact details are not exposed before the relevant consent/disclosure stage
- changing subject kind, automation state, authority, accountability owner, or scope marks dependent artifacts, policy decisions, caches, receipts, exports, partner/federation outputs, and intro requests stale

## `background-power-asymmetry-gates.test.ts`

Verify:

- configured high-dependency relations such as funder/grantee, employer/applicant, landlord/tenant, clinician/client, legal or immigration adviser/client, mentor/mentee, platform admin/user, and regulator/regulated-party contexts trigger the required review/safeguards
- pending, blocked, expired, revoked, wrong-purpose, wrong-scope, or missing reviews block opportunity creation, intro advancement, counterparty prompts, reminders, and disclosure where configured
- power-asymmetry safeguards use neutral copy, no urgency/scarcity/vulnerability boost, purpose-compatible review, and side-channel-safe labels
- power-asymmetry records are not used for popularity ranking, engagement optimization, ad targeting, payment priority, broad reputation scoring, or requester-visible diagnostics

## `background-claim-assurance.test.ts`

Verify:

- high-impact claims about credentials, authority, funds, affiliations, legal/medical/immigration expertise, fiscal sponsorship, scarce resources, or safety-relevant capabilities require current purpose-compatible assurance before they can drive high-confidence briefs, intro advancement, reliance wording, or disclosure
- self-attested, expired, revoked, rejected, stale, wrong-purpose, wrong-surface, or under-assured claims fail closed or remain low-assurance drafts
- claim evidence remains vault-bound / sensitive-store-bound and is not exposed through requester/counterparty APIs, receipts, telemetry, exports, operator queues, or public docs

## `background-ephemeral-candidate-evaluation.test.ts`

Verify:

- non-surfaced candidates, near-miss scores, rejected candidate lists, blocked-candidate lists, per-candidate factor vectors, and full candidate-evaluation traces are not retained after a run except as minimum-necessary redacted aggregate safety/quota state or under a valid active safety/legal hold
- non-surfaced evaluation artifacts cannot be used for matching, ranking, candidate reputation, analytics, future surfacing, notifications, intro requests, or disclosure

## `background-backup-restore-retention.test.ts`

Verify:

- backups, snapshots, search-index snapshots, warehouse snapshots, and disaster-recovery restores are encrypted, access-limited, time-bounded, and excluded from analytics/model evaluation
- restore processes replay deletion/redaction/anonymization manifests before restored data enters active systems
- restores cannot repopulate cleared candidate/counterparty identifiers, stable candidate hashes, raw source text, exact wishes, expired grants, revoked authorizations, expired exposure settings, or anonymized artifacts

## `background-federation-bridge-boundary.test.ts`

Verify:

- federation, external search, partner callback, and cross-platform bridge paths are default-off and require named active grants, current risk review, current pilot evaluation, purpose/version compatibility, schema compatibility, and policy decisions
- bridge payloads contain only minimum-necessary sanitized broad fields and never include raw source text, exact wishes, active candidate identifiers, internal rows, dependency snapshots, exact blockers, exact timing, or reusable candidate-specific profile exports
- bridge revocation, expiry, emergency stops, purpose-policy changes, aggregate-release failure, or schema changes stale dependent payloads, caches, receipts, exports, and policy decisions

## `background-reviewer-conflict-recusal.test.ts`

Verify:

- high-impact review, intro approval, exact-field reveal, partner/federation grant approval, risk-review approval, pilot-evaluation approval, aggregate release, and emergency-control release check conflict/recusal state
- conflicted operators, admins, reviewers, and partner seats cannot approve, reveal, suppress, advance, release, or review matters involving themselves, their organizations, financial interests, partner interests, or repository-defined close affiliations without a documented policy waiver and independent reviewer path
- conflict summaries are redacted and do not expose exact wishes, source notes, candidate identities, private cohort membership, legal strategy, or hidden abuse heuristics

## `background-pilot-evaluation-safety-case.test.ts`

Verify:

- non-staff, partner, federation, high-sensitivity, high-impact-claim, broader-cohort, and public-broad-preview lanes require current pilot-evaluation records covering exact purpose-code/version, surfaces, audience/cohort scope, output schemas, and rollout stage
- shadow/canary evaluations cannot create ordinary-user-facing opportunity briefs, candidate-facing exposure, notifications, intro requests, disclosure grants, exports, or requester-visible diagnostics
- promotion is blocked when pre-registered harm, burden, false-match, report, operator-overrule, privacy, latency, utility, or adversarial safety-case thresholds fail or are missing
- independent adversarial review / red-team signoff is current, independent, redacted, and passed before broad external rollout or material high-impact safety/governance changes where configured
- evaluation metrics remain aggregate and redacted and cannot become matching features, candidate reputation, engagement optimization, payment-tier priority, partner priority, notification priority, intro advancement, or disclosure triggers

## `background-match-signal-lineage.test.ts`

Verify:

- every eligibility, scoring, opportunity-brief creation, notification, feedback advancement, intro-request, and disclosure path reads matchable signals through active lineage records
- missing, stale, orphaned, client-supplied, copied-without-lineage, retention-expired, revoked-source, wrong-taxonomy-version, wrong-purpose-version, or wrong-confirmation lineage fails closed
- source-summary revocation, tag revocation, profile-field revocation, disclosure-grant revocation, collective-authority revocation, partner-grant revocation, and purpose-registry changes mark dependent lineage rows and active artifacts stale
- lineage rows never store raw source text, exact wishes, contact details, private third-party data, candidate identifiers, or requester-visible reason strings

## `background-quasi-identifier-redaction.test.ts`

Verify:

- requester-facing and counterparty-facing briefs, receipts, prompts, exports, telemetry, diagnostics, partner reports, and public reports are checked for rare combinations across broad fields, factor codes, cohort labels, purpose labels, provenance labels, timing, and dependency labels
- unique or too-sparse combinations are coarsened, delayed, withheld, or suppressed even when each individual field is allowed
- quasi-identifier diagnostics and safe-pool uniqueness values are service-side only and never appear in requester/counterparty surfaces
- suppression because of a quasi-identifier risk maps to generic requester-safe language and side-channel-safe timing

## `background-entity-resolution.test.ts`

Verify:

- imported aliases, email/calendar contacts, public URL mentions, partner records, organization names, account similarities, and model-suggested duplicate profiles do not become candidate identities, dedupe keys, or disclosure targets without self-claim, independent verification, or operator-confirmed resolution
- ambiguous, disputed, stale, expired, partner-only, or imported-only entity-resolution claims are hard blockers for scoring, surfacing, intro creation, and disclosure
- entity-resolution status, alias evidence, duplicate links, confidence, disputes, and canonical entity references are not exposed through requester/counterparty APIs, receipts, diagnostics, exports, telemetry, partner reports, or public docs
- changes to entity-resolution state mark dependent active artifacts, caches, receipts, intro requests, and policy decisions stale

## `background-consent-ui-integrity.test.ts`

Verify:

- high-impact consent flows for public-broad-preview exposure, partner-matchmaker exposure, high-sensitivity/vulnerability signal confirmation, collective authority, candidate budget widening, vault decrypt reveal, and field-level disclosure grants use neutral copy and explicit consequence summaries
- high-impact consent flows reject default-on choices, bundled unrelated consents, preselected broad scopes, hidden revocation paths, confirm-shaming, deceptive urgency, or engagement-optimized copy
- enabling or scope-broadening flows require a current server-derived effective-permission preview and fail closed when the preview is stale, wrong-action, wrong-participant, wrong-schema, or dependency-outdated
- required comprehension/confirmation events are server-recorded and versioned before the corresponding authorization, exposure, tag, budget, or disclosure grant becomes active
- withdrawing or failing the comprehension/confirmation step leaves the relevant scope off/draft and creates no match input


## `background-participant-control-center-ux.test.ts`

Verify:

- onboarding is staged and default-off, with no `enable all` path for outbound delegate authorization and inbound candidate exposure
- every participant-facing Background Delegate screen renders from sanitized server-derived screen-state DTOs or repository-equivalent projections, not from internal rows, local feature flags, direct table reads, or copied policy logic
- visible action controls are limited to the server-provided allowed visible action keys and still require fresh action-specific policy decisions before side effects
- disabled, stale, blocked, future-phase, privacy-gated, and unavailable states use generic, non-enumerating labels and do not reveal candidate-specific gates or hidden policy outcomes
- high-impact screens show privacy-impact summaries and effective-permission before/after previews covering data used, purpose, audience/scope, surfaces, expiry/reconfirmation, revocation effect, and hidden data categories
- control-center screens use progressive disclosure: simple safe path first, advanced settings separated, and no requirement for ordinary users to inspect governed-artifact hashes or internal policy jargon
- opportunity cards state that a brief is not an introduction and avoid urgency, scarcity, popularity, or engagement-optimized prompts
- counterparty prompt screens do not reveal requester identity, exact wishes, exact targeting reason, private cohort membership, or internal identifiers before the appropriate consent stage
- privacy freeze / panic pause is reachable from every Background Delegate screen and activates without step-up or reason text and invalidates queued/cached screen states
- notification/digest preferences, quiet hours, and non-critical notification-volume controls can only narrow or batch delivery and cannot force immediate candidate-specific sends or suppress required safety/account notices
- safe undo/reversal paths for non-disclosing actions do not create consent, resurrect stale artifacts, disclose counterparties, or bypass fresh revalidation
- screen-state cache, UI hydration payload, local storage, and offline snapshot invalidation works on revocation, freeze, source-summary revocation, candidate exposure change, disclosure grant change, emergency control, output-schema bundle change, notification-preference change, and retention cleanup

## `background-governance-dual-control.test.ts`

Verify:

- high-impact changes such as purpose semantic broadening, external risk-review approval, public-broad-preview enablement, partner-grant activation, emergency-stop release, tripwire disabling, aggregate-release approval, vault-reveal policy changes, production-data exceptions, and broad retention holds require the configured separation-of-duties approval path
- self-approval, expired approvals, wrong-role approvals, wrong-scope approvals, stale hard-gate snapshots, and missing second approvals fail closed before the dependent change becomes active
- high-impact approval records are redacted, immutable after approval except revocation/expiry metadata, and never exposed through requester/counterparty/partner surfaces
- revoking or expiring a high-impact approval marks dependent policy decisions, feature-flag promotions, partner grants, aggregate releases, emergency releases, caches, exports, and active artifacts stale without automatically resuming matching or disclosure

## `background-delegate-tool-sandbox.test.ts`

Verify:

- delegate runs, workers, LLM proposal paths, and partner-service callbacks can invoke only registered active tool capabilities for the exact policy-decision action kind
- unregistered, disabled, wrong-purpose, wrong-action, network-enabled-without-review, write-capable-without-review, vault-decrypt, arbitrary fetch/browser/scraper, code-execution, contact/email/calendar write, payment, or partner API tools fail closed
- imported source text, public URLs, emails, calendar exports, chatbot history, and partner payloads cannot alter tool permissions or request new tools through prompt injection
- tool execution logs are redacted and exclude raw prompts, source text, exact wishes, contact details, candidate identities, private cohort membership, partner secrets, and hidden abuse heuristics

## `background-account-security-step-up.test.ts`

Verify:

- broad delegate authorization, public-broad-preview exposure, partner-matchmaker exposure, candidate budget widening, high-sensitivity/vulnerability signal confirmation, vault reveal, field-level disclosure grants, collective authority activation, and post-recovery reactivation require current step-up authentication or repository-equivalent reauthentication
- active account-security holds suppress high-impact background-networking actions, queued sends, cached payloads, and disclosure grants until review or participant re-confirmation
- suspicious-login/recovery/device/fraud details are not exposed through requester/counterparty APIs, receipts, exports, telemetry, diagnostics, or public docs

## `background-participant-correction-requests.test.ts`

Verify:

- participants can request correction, narrowing, revocation, deletion, or review of their own profile fields, source summaries, confirmed tags, candidate-exposure settings, delegate authorizations, safety preferences, entity-resolution claims about themselves, disclosure grants, and generic denial categories
- correction flows do not reveal candidate existence, candidate opt-out, budget exhaustion, cool-off, cohort membership, privacy-stage conflict, retention/anonymization, exact blocker states, hidden abuse heuristics, or private cohort membership
- accepted corrections update versions, stale invalid lineage, and mark dependent active briefs, intro requests, policy decisions, cached payloads, exports, receipts, outbox rows, disclosure grants, and aggregate releases stale where applicable

## `background-policy-composition-and-state-machines.test.ts`

Verify:

- overlapping requester authorization, candidate exposure, disclosure grants, safety preferences, privacy freezes, retention holds, emergency controls, tripwires, partner/federation grants, vault policies, output schemas, and rollout rules are composed by least-permissive intersection semantics
- any denial, pause, expiry, missing binding, narrower scope, stale version, or ambiguity overrides a broader allow and fails closed without surfacing, notification, disclosure, export, or actionable artifact creation
- cached, client-supplied, partner-supplied, migration-generated, rollback-generated, or operator-supplied permissions cannot broaden the effective scope beyond the narrowest active governing control
- every stateful background-networking artifact type has an allowlisted transition policy, and unknown, skipped, reverse, stale-source, disabled, client-supplied, or cross-artifact-inconsistent transitions fail closed
- stale, closed, expired, redacted, anonymized, revoked, declined, frozen, deleted, and released artifacts cannot become actionable again except by recomputing a new artifact from currently valid inputs under a fresh policy decision
- state-transition side effects are atomic or idempotent: queued work is cancelled, outbox rows are suppressed, budget reservations are released, dependent artifacts are marked stale, caches/exports are invalidated, receipts/audit rows are created as configured, and retention cleanup is scheduled
- policy-composition rules and artifact state-transition policies are bound into the release/config manifest by version and content hash; CI recomputes both hashes and fails closed on same-version mutation, partial bundle materialization, stale docs, orphaned tests, stale rows, or bundle-hash mismatch
- policy-composition rules cannot be broadened, deny-overrides cannot be weakened, non-waiver exceptions cannot be added, transition preconditions cannot be reduced, transition side effects cannot be removed, and resurrection paths cannot be introduced without a new bundle version/hash, high-impact governance approval, and conflict-recusal checks

## `background-policy-decision-layer.test.ts`

Verify:

- every route, worker, notification builder, cache renderer, export job, telemetry builder, operator approval path, and retention cleanup path requires a fresh server-generated policy decision for the exact action kind
- a policy decision for one action kind cannot authorize another action kind
- every action kind used by routes, workers, operators, tool capabilities, phase-gate bundles, outbox sends, exports, telemetry, vault access, partner callbacks, retention cleanup, and governance actions is present in the current governed action-kind registry and rejects catch-all or client/partner/operator-supplied action names
- adding or broadening a side-effecting action kind requires a new registry version and governed release/config activation where policy requires it
- emitted payload actions snapshot and validate the current output-schema bundle version/hash and fail closed on schema-bundle mismatch, same-version mutation, or forbidden extra keys
- side-effecting allow decisions are atomically consumed exactly once under the server-derived action idempotency key; already-consumed, replayed, wrong-idempotency-key, wrong-lane, wrong-schema, wrong-output-schema-bundle-hash, wrong-manifest, wrong-bundle-hash, or wrong-dependency decisions fail closed without duplicate side effects
- client-supplied, stale, expired, wrong-purpose, wrong-schema, wrong-dependency, wrong-policy-version, or partial policy decisions fail closed
- feature flags, fixtures, operator/admin actions, and break-glass paths cannot bypass the canonical policy evaluator
- redacted policy-decision receipts exclude candidate identifiers, exact blocker reasons, exact timing, vault contents, internal dependency snapshots, private cohort membership, and hidden abuse heuristics

## `background-private-data-vault-boundary.test.ts`

Verify:

- raw source text, exact source summaries, exact wishes, contact fields, private constraints, exact disclosure-granted fields, and operator-reveal payloads are stored only in the encrypted vault or repository-equivalent sensitive-field store
- deterministic matching, scoring, anti-probing, notifications, opportunity briefs, intro requests, telemetry, analytics, and public reports cannot decrypt or read vault artifacts
- decryption requires a fresh policy decision, purpose/field scope, reason code, actor role, expiry, and redacted audit entry
- vault artifacts are not copied into logs, screenshots, caches, UI hydration payloads, exports, LLM/model evals, staging, CI, demo, replay, or vendor-debug contexts
- revocation, key rotation, expiry, grant narrowing, or deletion marks dependent proposals, source summaries, active briefs, intro requests, queued notifications, cached projections, and exports stale or purges them before render/send/download

## `background-aggregate-release-controls.test.ts`

Verify:

- internal dashboards, partner reports, public reports, telemetry exports, research extracts, and measurement queries require an approved aggregate-release control for the query family and scope
- the release manifest binds `aggregate_release_policy_version` and `aggregate_release_policy_hash`; policy decisions for aggregate-release actions fail closed on missing, stale, wrong-scope, or wrong-hash aggregate-release policies
- sparse cohorts, exact blocker/gate counts, exact timing distributions, repeated deltas, budget/exposure states, block/mute states, and high-sensitivity/vulnerability-like signal categories are suppressed, bucketed, or noised before release
- ad-hoc analytics over internal rows, candidate identifiers, vault artifacts, exact blocker states, exact timing, internal dependency snapshots, or operator-reveal logs is blocked outside a scoped incident/legal process
- revoking or expiring an aggregate-release control invalidates dependent dashboards, scheduled exports, cached aggregate payloads, policy decisions, and partner reports
- canonical aggregate-release policy hashes are recomputed in CI, and same-version in-place mutations, partial bundle materialization, stale docs, orphaned tests, or client/analyst/partner-supplied aggregate-release claims fail closed before promotion

## `background-candidate-handle-isolation.test.ts`

Verify:

- delegate runs, scoring, anti-probing, non-surfaced evaluation, receipts, telemetry, diagnostics, and policy decisions use run-scoped candidate handles or equivalent blinded references rather than stable profile/account/contact identifiers
- ordinary route handlers, client components, exports, partner callbacks, analytics, and LLM tools cannot resolve candidate handles to stable identities
- handle resolution requires a fresh action-specific policy decision and an allowed reason such as operator review, mutual consent, safety hold, or legal hold
- handles are not reused across runs to create a linkable candidate graph
- redaction, anonymization, expiry, privacy freeze, candidate exposure revocation, participant deletion, or retention cleanup clears or irreversibly coarsens handle mappings

## `background-participant-privacy-freeze.test.ts`

Verify:

- a participant can activate an account-wide privacy freeze without giving a free-text explanation
- active freezes block outbound delegate runs, inbound surfacing, queued notifications, counterparty consent prompts, feedback advancement, intro requests, disclosure-grant access, vault reveal, partner/federation outputs, exports, cache renders, and nonessential operator reveal
- requesters and counterparties see only generic stale/unavailable/recompute labels and cannot infer that a freeze exists or why it was activated
- release requires step-up authentication or repository-equivalent reauthentication plus a fresh policy decision
- release does not automatically resume stale briefs, queued notifications, old intro requests, disclosure grants, exports, or partner/federation outputs

## `background-data-export-and-model-reuse.test.ts`

Verify:

- participant data exports use versioned sanitized allowlist schemas and reject extra keys before file creation, logging, caching, or download
- exports include only participant-owned contributed fields, consents, source-summary metadata, confirmed tags, exposure settings, disclosure grants, privacy-freeze records, safety preferences, and redacted receipts
- exports exclude candidate/counterparty identifiers, run-scoped candidate handles, hidden blockers, exact gate outcomes, internal policy decisions, abuse heuristics, rare-combination internals, private cohort membership of others, partner-seat data, raw source text, and third-party private data
- export generation and download revalidate retention, revocation, privacy-freeze, emergency-control, output-schema, and disclosure-grant state
- background-networking data cannot be used for model training, fine-tuning, embedding training, recommender training, behavioral personalization, ad targeting, growth ranking, engagement optimization, or product-analytics feature learning without a separate explicit opt-in and risk-reviewed synthetic/redacted path
- any model-derived output from an approved research/evaluation path remains proposal-only and cannot influence matching without the ordinary participant confirmation and lineage path

## `background-delegate-authorizations.test.ts`

Verify:

- delegate runs require an active, unexpired authorization
- revoked, expired, overlong, client-only, or stale-renewal authorizations cancel pending runs and prevent new briefs
- global cross-registry scope is rejected unless `BACKGROUND_GLOBAL_DELEGATE_RUNS_ENABLED=true` and operator rollout approval exists
- run budgets, brief budgets, candidate limits, allowed purpose codes, purpose-policy versions, maximum authorization duration / renewal windows, and minimum confidence bands are enforced
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
- requester, candidate, and counterparty views, dismissals, maybe-later decisions, accepts, declines, ignores, timeouts, reports, request-more-context actions, intro requests, receipt clicks, dwell time, budget/exposure pauses, and notification interactions do not become matching inputs, hidden preferences, engagement ranking signals, profile-completeness signals, popularity metrics, or candidate/counterparty-reputation inputs unless converted into an explicitly confirmed broad field/tag proposal by the relevant person

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
- opportunity feedback and view/action events update only action, retention, cool-off, intro, receipt, and redacted safety state; they do not silently mutate profiles, confirmed tags, ranking, candidate reputation, or future match scores
- requester-facing opportunity-brief response schemas are exact allowlists: newly added internal columns, unknown keys, ORM relations, debug metadata, and spread fields are rejected or stripped before logging, caching, telemetry, rendering, exports, or network response
- interested feedback / intro-request creation never accepts or trusts client-supplied `counterparty_profile_id`, candidate ids, candidate hashes, exact target descriptors, contact details, or purpose overrides; counterparty selection is derived only from the valid internal opportunity brief after hard-gate revalidation
- requester-facing intro-request responses use sanitized exact allowlist schemas and never expose exact counterparty identity, candidate-specific gate state, exact decline/expiry reasons, operator notes, timing side channels, or internal intro-request row fields before mutual consent

## `background-opportunity-internal-dependency-isolation.test.ts`

Verify:

- ordinary requester/counterparty routes, client components, exports, receipts, telemetry builders, partner callbacks, and debug endpoints cannot read `background_opportunity_brief_internal_dependencies` or legacy internal candidate-dependency columns
- sanitized opportunity projections exclude candidate handles, candidate profile ids, candidate-key hashes, candidate opt-in/exposure/budget/cohort snapshots, exact stale causes, exact gate codes, and internal dependency hashes
- redaction, anonymization, candidate exposure revocation, privacy freeze, retention cleanup, participant deletion, and backup restore clear or coarsen active candidate identifiers and stable hashes
- legacy combined tables fail closed for ordinary routes until column grants, sanitized views, serializer tests, and migration tests prove internal fields cannot serialize

## `background-intro-requests.test.ts`

Verify:

- requester-created intro requests derive the internal counterparty only from a valid active opportunity brief after all inherited hard gates are revalidated
- client-supplied counterparty ids, candidate ids, candidate hashes, private cohort ids, target descriptors, purpose overrides, exact wish text, or contact details are rejected
- requester-facing intro-request status uses a sanitized versioned allowlist schema and never exposes exact counterparty identity, candidate/counterparty hashes, private cohort membership, candidate-specific decline/expiry reasons, exact operator notes, exact timing, or polling side channels
- repeated `interested` feedback, duplicate intro-request submissions, client retries, queue retries, and replayed requests for the same requester-owned brief and inherited purpose-code/version pair are idempotent and create at most one active intro request, one intro-created receipt, one operator-review task, and one candidate budget reservation/counter increment
- requester-facing duplicate/replay responses return only the existing sanitized intro state or a generic conflict/already-pending state, without revealing candidate-specific decline, opt-out, budget, cool-off, cohort, retention, privacy-stage, or operator-review reasons
- counterparty-facing intro-consent notifications and payloads use a separate sanitized versioned allowlist schema and show only broad purpose, broad requested disclosure categories, generic rationale, generic operator-review status, coarse review-window bucket, and safe choices
- counterparty-facing intro-consent payloads do not expose requester exact identity, contact details, exact wishes, source notes, private cohort membership, exact requester strategy, exact targeting reason, internal opportunity-brief rows, or requester source-summary dependencies before mutual consent
- counterparty `ask_for_more_context` creates a sanitized disclosure-request artifact, requires requester approval and operator review where policy requires, and does not create a freeform requester/counterparty backchannel
- counterparty accept, decline, report, timeout, or request-more-context states remain generic to the requester unless the counterparty explicitly consents to reveal more

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
- participant notification preferences can narrow, batch, or pause non-critical notifications, but cannot force immediate candidate-specific sends, reveal no-result timing, override fixed digest/jitter rules, bypass counterparty notification budgets, or suppress required account-security/privacy/retention notices
- unsafe email outbox rows cannot be sent
- opportunity-brief creation cannot enqueue candidate-facing notifications
- candidate-facing notification is possible only through an intro-consent flow after operator review
- counterparty-facing intro-consent notifications use a separate sanitized allowlist schema and exclude requester exact identity, contact details, exact wishes, source notes, private cohort membership, exact targeting reasons, and internal identifiers before mutual consent

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
- anti-probing budgets aggregate across route families, manual scans, no-result surfaces, receipt/intro polling, requester accounts, organization/cohort roles, and repository-standard abuse principals where privacy policy permits
- abuse-principal metadata used for anti-probing is redacted/internal-only, short-retention, and unavailable to matching, scoring, ranking, requester-facing diagnostics, exports, or telemetry
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
- ordinary authenticated users cannot read internal intro-request columns for requester-owned intro requests; requester-facing intro routes, receipts, exports, telemetry, caches, and debug endpoints use sanitized schemas that exclude `counterparty_profile_id`, exact counterparty state, exact decline reasons, operator notes, and timing-sensitive fields
- database constraints, idempotency keys, queue de-duplication, and API handlers prevent duplicate active background-networking intro requests for the same requester-owned opportunity brief and inherited purpose-code/version pair, including under concurrent requests and worker retries

## `background-delegate-receipts.test.ts`

Verify:

- opt-in, authorization create/renew/revoke, inbound exposure confirm/renew/pause/revoke, notification-preference changes, source-summary approval/revocation, tag confirmation/revocation, delegate runs, opportunity-brief creation/staling, feedback advancement, intro-request creation, disclosure grants/revocations, data exports, correction requests, privacy freezes/releases, operator/vault reveal records where policy permits, and retention cleanup create governed redacted receipts or delayed/internal-only redacted receipt records
- receipts are participant-scoped under RLS and render only through active output-schema and UI-copy bundles
- receipt factor/blocker aggregates and any budget-state information are bucketed, suppressed, or genericized where exact counts or labels could reveal candidate-specific gates
- receipt payloads exclude raw source text, exact wishes, exact candidate identity, private cohort membership, prompts, message text, private notes, exact operator notes, legal strategy, hidden gate outcomes, rare-combination internals, and abuse heuristics
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
- changing candidate exposure purpose codes, purpose-policy version, expiry / re-confirmation deadline, or other exposure settings updates `candidate_exposure_version` and marks dependent active briefs stale
- expired, missing, or stale candidate exposure confirmations suppress scoring, surfacing, opportunity-brief display, feedback advancement, and intro-request creation until the candidate explicitly re-confirms
- candidate inbound surfacing budgets, pending-intro limits, cool-off state, and budget-version checks are enforced before scoring, surfacing, opportunity-brief display, feedback advancement, and intro-request creation
- budget exhaustion or cool-off marks dependent active briefs blocked/stale and prevents additional surfacing until reset or explicit candidate budget widening
- candidate budget status is shown only in coarse terms and does not reveal requester identities, exact sparse counts, or private cohort membership
- opportunity briefs snapshot candidate exposure state without exposing exact private candidate details

## `background-candidate-exposure-budgets.test.ts`

Verify:

- non-`off` inbound delegate discovery requires bounded per-purpose/per-scope surfacing budgets, pending-intro limits, cool-off behavior, and finite exposure expiry / re-confirmation deadlines
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

## `background-signal-taxonomy.test.ts`

Verify:

- the active release/config manifest binds `signal_taxonomy_version` and `signal_taxonomy_hash`, the hash recomputes from the complete sorted signal-taxonomy registry, and signal-taxonomy-gated actions fail closed on missing, stale, partial, client-supplied, or same-version-mutated taxonomy records
- every field or tag that can influence eligibility, scoring, surfacing, notifications, opportunity briefs, feedback advancement, intro requests, or disclosure prompts maps to a current active signal-taxonomy entry from the active version/hash
- unclassified, deprecated, disabled, stale-version, purpose-mismatched, or surface-mismatched signals fail closed
- high-sensitivity and vulnerability-like signals require explicit step-up confirmation, purpose compatibility, risk-review coverage where configured, and generic requester/counterparty outputs
- high-sensitivity or vulnerability-like signals cannot increase score, urgency, notification priority, candidate ordering, or engagement priority merely because they reveal distress, dependency, or exploitability
- taxonomy changes that broaden use, lower sensitivity, remove vulnerability-like status, weaken confirmation/review requirements, or add purposes/surfaces require a new taxonomy version/hash and mark dependent confirmations, lineage records, briefs, intro requests, and disclosure grants stale unless explicitly re-confirmed

## `background-pairwise-safety-preferences.test.ts`

Verify:

- active block, mute, do-not-match, no-reminder, and no-recontact preferences suppress in-scope matching, opportunity-brief creation, notifications, feedback advancement, intro requests, reminders, and disclosure grants
- requester-facing and counterparty-facing responses never reveal whether a specific participant blocked/muted another participant, the exact block scope, or the exact reason
- creating, changing, expiring, or revoking a preference marks dependent active briefs, intro requests, reminders, queued notifications, cached projections, exports, and disclosure grants stale or blocked
- safety preferences are not used for popularity ranking, engagement optimization, candidate reputation, or broad deplatforming outside the corroborated safety/tripwire process

## `background-cache-outbox-invalidation.test.ts`

Verify:

- revoking authorization, candidate exposure, source-summary tags, field-level disclosure grants, pairwise safety preferences, emergency controls, or retention state invalidates requester/counterparty-visible caches, UI hydration payloads, exports, and queued notifications before render/send/download
- cached and queued payloads carry schema, grant, authorization, exposure, and retention versions needed for revalidation
- stale queued emails, push notifications, reminders, digest entries, and export snapshots are suppressed or regenerated from valid sanitized projections rather than sent from old payloads
- client-side storage does not keep exact wishes, contact details, candidate identifiers, internal dependency snapshots, high-sensitivity signals, or exact disclosure-grant values beyond the allowed short-lived cache window

## `background-development-data-isolation.test.ts`

Verify:

- development, CI, staging, demo, load-test, red-team replay, and LLM/model-evaluation paths use synthetic or formally redacted background-networking fixtures by default
- production background-networking rows, screenshots, replay logs, source notes, exact wishes, candidate identifiers, private cohort membership, and disclosure-grant payloads cannot be exported into non-production fixtures without a scoped incident/legal approval artifact
- debug endpoints, test helpers, snapshot serializers, notebooks, and model-eval builders reject real background-networking artifact rows unless a minimum-necessary redaction policy has already run

## `background-purpose-registry.test.ts`

Verify:

- the active release/config manifest binds both `purpose_registry_version` and `purpose_registry_hash`
- the purpose-code registry is the single source of truth for purpose labels, canonical summaries, allowed surfaces, prohibited-use codes, risk tiers, and confirmation requirements
- CI recomputes the canonical purpose-registry hash and detects same-version in-place mutation, partial registry materialization, stale purpose rows, orphaned tests, stale docs, and registry-hash mismatches
- active semantic fields are append-only after activation; material changes require a new registry version/hash and, where needed, a new policy version or new purpose code
- disabled, deprecated, superseded, user-defined, missing, catch-all, or client-invented purpose codes are rejected
- UI/API purpose labels come from the same registry artifact used by server-side validation
- purpose-registry version/hash changes mark dependent authorizations, candidate exposure settings, active briefs, receipts, policy decisions, and intro requests stale unless explicitly re-confirmed
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


## `background-retention-policy-bundle-integrity.test.ts`

Verify:

- the active release/config manifest binds both `retention_policy_bundle_version` and `retention_policy_bundle_hash`
- every background-networking artifact kind and retention class used by routes, workers, caches, outboxes, exports, telemetry, vault metadata, backup manifests, and cleanup jobs resolves to exactly one active retention-policy row from that bundle version/hash
- CI recomputes the canonical retention-policy bundle hash and detects same-version in-place mutation, partial bundle materialization, stale retention-policy rows, orphaned tests, stale docs, and retention-policy hash mismatches
- missing or mismatched retention-policy bundles block new linkable artifact creation, display, notification, intro advancement, disclosure, export, backup restore, and retention cleanup paths that would otherwise extend linkable retention
- extending linkable windows, widening retained fields, weakening anonymization/deletion/cache-invalidation/outbox-suppression requirements, weakening backup deletion-manifest requirements, or allowing more direct identifiers requires a new retention-policy bundle version/hash, privacy or legal review where applicable, and governed manifest activation

## `background-retention-lifecycle.test.ts`

Verify:

- delegate runs, opportunity briefs, feedback, intro requests, receipts, exports, caches, outbox rows, candidate handles, match-signal lineage, vault metadata, and backup manifests all resolve their retention windows from the current content-addressed retention-policy bundle
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


## `background-disclosure-grants.test.ts`

Verify:

- exact-field disclosure after mutual consent requires a field-level disclosure grant tied to a valid intro request, inherited purpose code/version, operator-reviewed consent step, and explicit grantor consent
- grants are field-bound, purpose-bound, time-bounded, revocable, non-transitive, and cannot authorize future matches, analytics, exports, model training, or unrelated intros
- broad grants such as `all_profile`, raw source exports, hidden model summaries, exact targeting reasons, internal dependency snapshots, and future profile changes are rejected
- revocation or expiry blocks future access, invalidates access tokens, marks dependent disclosure surfaces stale, schedules retention cleanup, and does not make stale opportunity briefs or intro requests actionable
- exact-field access uses short-lived server-rendered views or repository-equivalent expiring access, requires recipient acknowledgement where configured, disables bulk download/copy by default unless explicitly granted, and revalidates grant/freeze/emergency/output-schema/UI-copy/client-surface/retention state at view time
- requester-facing and counterparty-facing grant responses use versioned allowlist schemas and exclude exact field values unless routed through the repository's explicit step-up exact-field retrieval flow
- UI copy distinguishes future-access revocation from retroactive erasure, and access-state labels expose only coarse participant-safe buckets rather than exact open times, dwell time, screenshot/copy events, or engagement signals

## `background-operator-review-minimization.test.ts`

Verify:

- ordinary operator queues and dashboards show redacted review artifacts by default, not full internal rows, raw source text, exact wishes, contact details, active candidate identifiers, candidate-dependency snapshots, or exact targeting reasons
- just-in-time operator field reveals require role authorization, reason code, target artifact, field keys, expiry, and redacted audit/receipt entries
- operator reveal paths cannot bulk browse, bulk export, unrestricted-search, telemetry-export, or debug-serialize exact wishes, source notes, contact details, candidate identifiers, or internal dependency snapshots
- admin/break-glass actions cannot use field reveals as a waiver mechanism for consent, purpose, stale-state, retention, anti-probing, RLS, encryption, or explicit-signal-only matching gates

## `background-counterparty-reminders.test.ts`

Verify:

- counterparty-facing intro-consent reminders are system-controlled, rate-limited, budgeted, generic, and side-channel-safe
- requesters cannot trigger reminders, choose reminder timing, inspect delivery/open/click state, or distinguish ignore, timeout, decline, report, opt-out, cool-off, emergency stop, operator suppression, or retention cleanup
- reminder suppression, delivery, batching, and expiry do not create requester-visible labels, timing signals, receipts, telemetry, exports, or notification-absence side channels


## `background-partner-matchmaker-grants.test.ts`

Verify:

- partner-matchmaker runs require a current active named partner grant covering the exact partner/workflow, purpose-code/version, surfaces, cohort/audience scope, quotas, allowed operator identities, and risk review
- generic `partner_matchmaker` scope without a named grant fails closed
- missing, expired, revoked, wrong-purpose, wrong-version, wrong-surface, wrong-cohort, wrong-partner, or over-quota grants fail closed before run creation, scoring, opportunity creation, notifications, feedback advancement, or intro creation
- partner staff and partner systems receive only sanitized projections/DTOs and cannot access raw registry rows, internal opportunity rows, candidate identifiers, candidate-dependency snapshots, exact blocker states, exact timing, or arbitrary query results
- partner grant revocation cancels pending runs, marks dependent active artifacts stale, and schedules retention cleanup without making stale artifacts actionable

## `background-collective-profiles.test.ts`

Verify:

- collective profiles require current representative authority for the selected purpose-code/version, surfaces, cohort/audience scope, and exposure setting
- repository instances without collective support reject collective-subject profiles rather than approximating them through an individual's private profile
- collective documents, member rosters, internal discussions, or strategy notes cannot create matchable member-level wishes, vulnerabilities, affiliations, capabilities, constraints, strategy, or contact details without that member's independent profile/exposure confirmation
- expired, revoked, disputed, missing, or wrong-scope representative authority blocks scoring, surfacing, notifications, feedback advancement, and intro-request creation

## `background-sybil-anti-probing.test.ts`

Verify:

- materially equivalent probes across accounts, partner seats, requester clusters, devices/sessions where policy permits, or coordinated requesters are detected through privacy-safe, redacted, retention-bound abuse signals
- cross-account anti-probing can trigger narrow throttling, review, or containment without exposing anti-abuse signals to requesters
- anti-sybil controls do not create broad fingerprinting, public analytics, engagement ranking, or permanent linkable identity graphs
- anti-sybil blockers override otherwise high scores and cannot be bypassed by account rotation, partner-seat rotation, queue retries, or manual-scan variants

## `background-paid-priority-neutrality.test.ts`

Verify:

- payment tier, partner commercial priority, sponsorship, paid quota, engagement predictions, click-through likelihood, or retention likelihood cannot influence eligibility, score, candidate ordering, surfacing, notification priority, feedback advancement, intro advancement, or disclosure
- paid or partner status may only affect access to reviewed lanes, support workflows, or quota after all non-waivable consent, safety, anti-probing, retention, risk-review, and explicit-signal gates pass
- telemetry and analytics do not turn payment/engagement metadata into hidden ranking or surfacing features

## `background-implementation-phasing-and-disabled-lanes.test.ts`

Verify:

- the repository has an explicit current implementation phase stored in a governed server-side phase artifact and bound into the active release/config manifest; public/internal docs describe which background-networking surfaces are enabled, disabled, or staff-only and validate against that same phase source
- route registration, worker registration, feature flags, queue consumers, UI panels, export paths, telemetry paths, partner callbacks, policy decisions, release manifests, docs, and tests cannot disagree about the active phase; any mismatch fails closed for the affected lane
- the active phase-gate bundle is content-addressed and append-only: CI recomputes the canonical lane-matrix hash, policy decisions snapshot the hash, same-version in-place mutation is detected, and a hash mismatch blocks the affected lane
- unimplemented or future-phase lanes, including partner-matchmaker, federation, public-broad-preview, high-sensitivity signal, high-impact claim, aggregate-release, vault-reveal, source-summary import, LLM interview, and exact-disclosure lanes, fail closed with generic deny/stale/unavailable states
- disabled stubs cannot enqueue delegate runs, score candidates, create opportunity briefs, send notifications, create intro requests, create disclosure grants, export data, emit requester-visible diagnostics, or call partner/federation/tool-capability paths
- feature flags, fixtures, direct route calls, client-side hidden state, queue replays, partner callbacks, migration backfills, and admin actions cannot activate a future-phase lane without its phase-specific policy decisions, risk reviews, pilot-evaluation records, output schemas, release manifest, and tests
- Phase 1 internal/staff-only core can run without source-summary-derived matching, LLM proposal paths, partner access, federation, public-broad-preview search, vault reveal, or exact-detail disclosure
- promotion from one phase to the next requires all phase-specific tests and rollback/stale/retention paths to pass, and failed or unsupported surfaces remain unavailable rather than partially launched

## `background-accessibility.test.ts` or existing route smoke

Verify:

- opportunity inbox, source review, wish profile apply, notification-preference, effective-permission-preview, privacy-freeze, and consent controls have accessible names
- keyboard path can complete dismiss, report, notification-preference narrowing, privacy freeze, and request-intro actions
- enabled user-facing screens meet repository-standard WCAG 2.2 AA-or-better checks, visible focus order, non-color-only status communication, screen-reader labels, reduced-motion behavior, touch/mobile layout, locale-aware date/time copy, and low-bandwidth fallback
- consent-critical copy passes plain-language/readability and localization checks, and accessibility/localization failures block promotion except for disabled stubs with no sensitive state or side-effecting controls

---

## `background-artifact-dependency-stale-propagation.test.ts`

Verify:

- active runs, briefs, intros, disclosure grants, screen states, effective-permission previews, outbox rows, exports, caches, partner/federation payloads, mediated contact sessions, and audit-sensitive operator actions record required dependency edges or are explicitly inert/non-actionable
- revocation, expiry, correction, manifest/bundle hash change, privacy freeze, emergency stop, source-summary/tag change, candidate-exposure/budget change, subject-identity/entity-resolution change, retention cleanup, and disclosure-grant change stale dependent artifacts before render/send/export/intro/disclosure/relay actions
- missing dependency edges, stale edge policies, failed propagation worklists, or stuck invalidation queues fail closed with generic stale/recompute/unavailable labels
- dependency edges contain only opaque refs, versions, hashes, and redacted labels, not raw source text, exact wishes, contact details, message content, candidate-specific gates, or abuse heuristics

## `background-mediated-contact-relay.test.ts`

Verify:

- mediated contact sessions can be created only from server-derived mutual-consent intro requests after all hard gates and required operator review pass
- relay sessions do not expose external contact fields, exact identity, exact wishes, raw source notes, or exact locations without separate field-level disclosure grants
- relay events are rate-limited, output-schema-bound, queue-freshness-bound, attachment/link restricted, block/freeze-aware, retention-bound, and excluded from matching, ranking, model training, and engagement telemetry
- decline, pause, close, timeout, and no-reason exits are generic to the other party and do not become reputation or match-quality signals

## `background-external-processor-minimization.test.ts`

Verify:

- notification, export, CDN, support, error-monitoring, translation, accessibility, fraud, and delivery-provider paths use only active named processor policies matching lane, action kind, output schema, data class, and retention class
- processors never receive raw source text, exact wishes, exact contact fields, candidate/counterparty identifiers, candidate-specific gate labels, rare-combination internals, message content, hidden abuse heuristics, or delivery/open/click telemetry that creates side channels
- missing, expired, wrong-lane, wrong-processor, wrong-hash, overbroad data-class, or same-version mutated processor policies fail closed

## `background-sensitive-audit-chain.test.ts`

Verify:

- manifest activations, governed-bundle activations, emergency releases, risk/pilot approvals, partner/federation/external-processor activations, retention/legal holds, operator reveals, vault reveals, exact disclosure grants, mediated-contact escalations, and break-glass actions append required tamper-evident redacted audit-chain events
- audit events chain to prior events or repository-equivalent integrity proofs, snapshot relevant policy-decision ids and bundle hashes, and verify under rollback/replay tests
- audit-chain events do not contain raw source text, exact wishes, candidate identities, exact contact details, message content, private cohort membership, legal strategy, exact blocker reasons, or hidden abuse heuristics
- missing, reordered, deleted, unverifiable, or hash-mismatched required audit events activate the narrowest applicable governance pause or emergency control

# Commands

Run the repository’s canonical checks for the current target phase, plus every disabled-lane and fail-closed regression test that protects future phases. The full mature-system suite below is required before the full system is complete. For Phase 0/1/2 work, Codex may run a phase-scoped subset only if the implementation notes state the target phase, list every omitted future-phase test, and show which disabled-lane tests prove the omitted surfaces are unavailable. Do not create empty placeholder tests or skip fail-closed tests for routes/workers/UI paths that exist.

Full mature-system command set:

```bash
npm run lint
npm run build
node --import tsx --test \
  src/lib/background-release-manifest-provenance.test.ts \
  src/lib/background-governed-bundle-canonicalization.test.ts \
  src/lib/background-output-schema-bundle-integrity.test.ts \
  src/lib/background-ui-copy-bundle-integrity.test.ts \
  src/lib/background-client-surface-integrity.test.ts \
  src/lib/background-synthetic-preview-isolation.test.ts \
  src/lib/background-tool-capability-bundle-integrity.test.ts \
  src/lib/background-subject-identity-and-automation.test.ts \
  src/lib/background-power-asymmetry-gates.test.ts \
  src/lib/background-networking.test.ts \
  src/lib/background-implementation-phasing-and-disabled-lanes.test.ts \
  src/lib/background-claim-assurance.test.ts \
  src/lib/background-claim-assurance-taxonomy-integrity.test.ts \
  src/lib/background-ephemeral-candidate-evaluation.test.ts \
  src/lib/background-backup-restore-retention.test.ts \
  src/lib/background-retention-policy-bundle-integrity.test.ts \
  src/lib/background-federation-bridge-boundary.test.ts \
  src/lib/background-reviewer-conflict-recusal.test.ts \
  src/lib/background-pilot-evaluation-safety-case.test.ts \
  src/lib/background-policy-composition-and-state-machines.test.ts \
  src/lib/background-policy-decision-layer.test.ts \
  src/lib/background-artifact-dependency-stale-propagation.test.ts \
  src/lib/background-sensitive-audit-chain.test.ts \
  src/lib/background-delegate-authorizations.test.ts \
  src/lib/background-match-signal-lineage.test.ts \
  src/lib/background-quasi-identifier-redaction.test.ts \
  src/lib/background-entity-resolution.test.ts \
  src/lib/background-consent-ui-integrity.test.ts \
  src/lib/background-governance-dual-control.test.ts \
  src/lib/background-delegate-tool-sandbox.test.ts \
  src/lib/background-account-security-step-up.test.ts \
  src/lib/background-participant-correction-requests.test.ts \
  src/lib/background-explicit-signal-matching.test.ts \
  src/lib/background-candidate-handle-isolation.test.ts \
  src/lib/background-participant-privacy-freeze.test.ts \
  src/lib/background-data-export-and-model-reuse.test.ts \
  src/lib/background-private-data-vault-boundary.test.ts \
  src/lib/background-third-party-data-minimization.test.ts \
  src/lib/background-anti-probing.test.ts \
  src/lib/background-brief-staleness.test.ts \
  src/lib/background-delegate-receipts.test.ts \
  src/lib/background-rollout-gates.test.ts \
  src/lib/background-risk-review-gates.test.ts \
  src/lib/background-partner-matchmaker-grants.test.ts \
  src/lib/background-collective-profiles.test.ts \
  src/lib/background-sybil-anti-probing.test.ts \
  src/lib/background-paid-priority-neutrality.test.ts \
  src/lib/background-admin-safety-actions.test.ts \
  src/lib/background-emergency-controls.test.ts \
  src/lib/background-runtime-safety-tripwires.test.ts \
  src/lib/background-disclosure-grants.test.ts \
  src/lib/background-operator-review-minimization.test.ts \
  src/lib/background-counterparty-reminders.test.ts \
  src/lib/background-retention-holds.test.ts \
  src/lib/background-retention-lifecycle.test.ts \
  src/lib/background-candidate-exposure.test.ts \
  src/lib/background-candidate-exposure-budgets.test.ts \
  src/lib/background-signal-taxonomy.test.ts \
  src/lib/background-pairwise-safety-preferences.test.ts \
  src/lib/background-cache-outbox-invalidation.test.ts \
  src/lib/background-aggregate-release-controls.test.ts \
  src/lib/background-development-data-isolation.test.ts \
  src/lib/background-purpose-registry.test.ts \
  src/lib/background-purpose-filtering.test.ts \
  src/lib/background-purpose-bindings.test.ts \
  src/lib/background-cohort-scoping.test.ts \
  src/lib/background-notification-policy.test.ts \
  src/lib/background-notifications.test.ts \
  src/lib/background-external-processor-minimization.test.ts \
  src/lib/background-privacy-controls.test.ts \
  src/lib/background-explanations.test.ts \
  src/lib/background-opportunity-briefs.test.ts \
  src/lib/background-opportunity-internal-dependency-isolation.test.ts \
  src/lib/background-intro-requests.test.ts \
  src/lib/background-mediated-contact-relay.test.ts \
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

- a current approved pilot-evaluation record with pre-registered utility, safety, privacy, burden, false-match, and rollback/sunset thresholds, covering the exact purpose code/version, surfaces, audience/cohort scope, output schemas, and rollout stage
- any required shadow-mode or staff/canary run completed without ordinary-user-facing exposure, candidate-facing exposure, or disclosure
- any required independent adversarial safety-case / red-team review passed, current, and scoped to the promoted lane
- a current approved adversarial risk review covering the enabled purpose codes, purpose-policy versions, surfaces, audience/cohort scope, notifications, retention, LLM data handling, abuse/collusion risks, rollback plan, and kill-switch owner
- no active emergency stop applying to the promoted purpose codes, purpose-policy versions, surfaces, audience/cohort scope, notification path, LLM mode, or retention class
- no active blocking runtime safety tripwire applying to the promoted purpose codes, purpose-policy versions, surfaces, audience/cohort scope, notification path, LLM mode, retention class, or hard-gate family
- no unresolved tripwire anti-DoS concern, including user-controllable aggregate signals that have generated broad blocking proposals without trusted corroboration or operator-confirmed basis
- zero known privacy leakage incidents
- zero prompt-injection bypasses that mutate state, disclosure, ranking, feature flags, or authorization scope
- zero unsafe notification sends, including candidate-facing notification from mere scan/brief creation
- no material increase in false-match, report, operator-overrule, opt-out, burden, conflict-recusal, or candidate/counterparty complaint rates compared with the pre-registered pilot baseline
- no unresolved critical finding in the current adversarial safety case, independent review, backup/restore drill, or federation/bridge audit for the lane
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

- The current implementation phase, enabled surfaces, disabled surfaces, and staff-only surfaces are generated from or validated against the governed current-phase artifact bound to the active release/config manifest; documentation must not be the source of truth for phase status.
- Participant-facing Background Delegate UI is task-based and server-state-derived. Documentation must explain the control center, staged opt-in, separate outbound/inbound permissions, server-derived effective-permission previews, privacy-impact summaries, notification/digest controls, receipt timeline, opportunity briefs as non-introductions, generic unavailable/stale labels, safe reversal limits, and the one-action privacy freeze / panic pause.
- Public and technical documentation must state that action-kind, output-schema, and tool-capability allowlists are generated from or validated against content-addressed governed bundles, not from prose, client-visible feature flags, or ad hoc constants.
- Background Delegate creates opportunity briefs, not introductions.
- Every matchable broad signal has active match-input lineage to a participant-visible confirmation, source/profile version, taxonomy version/hash, purpose binding, retention state, and revocation state; orphaned or stale signals fail closed.
- Candidate identity and organization/collective resolution are conservative: imported aliases, public mentions, partner records, contact-book data, and model-suggested duplicates are not matchable identities unless self-claimed, independently verified, or operator-confirmed under policy.
- Requester-facing and counterparty-facing outputs are checked for quasi-identifier / rare-combination risk across the full payload, not just individual fields. Unique or sparse combinations are coarsened, withheld, delayed, or suppressed.
- High-impact consent flows use neutral copy, concrete consequence summaries, no default-on or bundled broad consent, visible revocation paths, and explicit comprehension/confirmation records.
- Hard gates are enforced through a centralized, deny-by-default policy-decision layer under a manifest-bound governed-bundle canonicalization profile. Every route, worker, outbox send, cache render, export, telemetry emission, operator approval, disclosure grant, and retention cleanup requires a fresh action-specific policy decision; missing or stale decisions fail closed. Side-effecting decisions are atomically single-use under server-derived idempotency keys, so retries, queue replays, admin tools, partner callbacks, and stale workers cannot reuse an allow verdict to create duplicate or broadened side effects. Purpose codes, signal taxonomies, policy action kinds, and output schemas come from content-addressed, append-only registries bound to the release manifest; catch-all action kinds, same-version-mutated purposes, same-version-mutated signal taxonomies, same-version-mutated action kinds, schema-hash mismatches, and same-version-mutated output schemas fail closed.
- Raw source material and exact private fields are kept behind a participant-owned sensitive-data vault or equivalent encrypted sensitive-field boundary. Matching and analytics receive only confirmed broad signals, redacted policy outputs, or sanitized projections.
- Matching is identity-minimized. Background runs use run-scoped pseudonymous candidate handles; stable profile, account, and contact identifiers stay behind a separate identity/contact service and are resolved only after a fresh policy decision for operator review, mutual consent, disclosure, or legally required safety handling.
- Participants can activate an account-wide privacy freeze / panic pause. Freezes pause outbound and inbound background networking, notifications, intro advancement, disclosure access, partner/federation outputs, exports, and cached surfaces without revealing the freeze or its reason to requesters or counterparties.
- Background-networking data is not training or engagement-optimization data. It is not used for model training, fine-tuning, embedding training, recommender training, behavioral personalization, ad targeting, growth ranking, engagement optimization, or product-analytics feature learning absent a separate explicit opt-in and risk-reviewed synthetic/redacted path.
- Participant data access and portability use sanitized exports. Exports contain only the participant's own contributed data and redacted receipts, not counterparty identities, hidden blockers, gate outcomes, internal policy decisions, abuse heuristics, rare-combination internals, private cohort membership of others, raw source text, or third-party private data.
- Aggregate analytics and public/partner reporting are privacy-budgeted. Sparse cohorts, repeated deltas, exact gate counts, exact timing, and high-sensitivity categories are suppressed, bucketed, or noised through an approved aggregate-release control before dashboarding or export.
- Non-staff, partner, federation, high-sensitivity, high-impact-claim, and public-broad-preview lanes require pre-registered pilot-evaluation records with utility/safety/privacy/burden thresholds, shadow/canary results where required, explicit sunset or rollback rules, and no engagement-optimization reuse of evaluation data.
- Broad external rollout and material high-impact safety/governance changes require current adversarial safety-case or independent red-team signoff where configured; unresolved critical findings fail closed and summaries are redacted through aggregate-release controls.
- Delegate runs require participant-controlled authorization, purpose limits, budget, server-bounded expiry / renewal, and revocation. Each run is single-purpose; multiple authorized purposes must be handled as separate runs with separate receipts and anti-probing controls. Purpose-code meanings are governed by a single versioned registry and cannot be silently broadened or reinterpreted after consent. Multi-purpose consent stores per-purpose `{purpose_code, purpose_policy_version}` bindings, not one ambiguous version for several codes.
- The purpose-code registry is the source of truth for user-facing purpose labels, canonical summaries, allowed surfaces, and re-confirmation requirements. Deprecated, disabled, superseded, or materially changed purpose codes require explicit re-confirmation before reuse.
- Non-staff and external-pilot delegate runs require a current approved adversarial risk review covering the exact purpose code, purpose-policy version, surfaces, audience/cohort scope, notifications, retention, LLM data handling, abuse/collusion risks, rollback plan, and kill-switch owner.
- Operator/admin review is not a waiver mechanism. Manual actions can narrow, suppress, quarantine, mark stale, reject, or approve a next step after all non-waivable gates pass; they cannot override consent, purpose, risk-review, anti-probing, retention, RLS, encryption, notification, or explicit-signal matching requirements.
- High-impact governance and safety changes use separation of duties. Public-broad-preview enablement, external risk-review approval, partner-grant activation, emergency-stop release, tripwire disabling, purpose-policy broadening, aggregate release, vault-reveal policy changes, and production-data exceptions require configured dual-control approval and redacted audit records.
- Background delegates run in a capability sandbox. They cannot browse, scrape, execute code over imported content, contact counterparties, write to calendars/email, call arbitrary partner APIs, call federation bridges, make payments, or decrypt vault data unless a narrow tool capability is registered, risk-reviewed, policy-gated, and tested.
- High-impact claims about credentials, authority, funding capacity, institutional affiliation, legal/medical/immigration expertise, fiscal sponsorship, scarce resources, or safety-relevant capabilities require current claim-assurance records before they can drive high-confidence briefs, intro advancement, reliance wording, or disclosure.
- Non-surfaced candidate evaluations are ephemeral; rejected candidates, near-miss scores, blocked-candidate lists, and per-candidate factor vectors are not retained as a shadow people-ranking database.
- Backups, snapshots, search indexes, warehouses, and disaster-recovery restores are retention-aware and cannot resurrect redacted, revoked, expired, or anonymized background-networking data into active systems.
- Federation and cross-platform bridges are default-off, named, purpose-bound, risk-reviewed, policy-gated, schema-sanitized, revocation-aware, and minimum-necessary; raw source text, exact wishes, active candidate identifiers, and reusable candidate-specific exports do not leave the repository by default.
- Operator, reviewer, admin, and partner-seat conflict-of-interest checks apply to high-impact review, intro approval, exact-field reveal, grant approval, risk review, pilot evaluation, aggregate release, and emergency-control release.
- High-impact participant choices require recent step-up authentication or equivalent reauthentication, and suspicious account-security events pause high-impact background-networking changes until review or re-confirmation.
- Participant correction paths are available for the participant's own background-networking data and generic denial categories, but they do not reveal candidate-specific gate outcomes, hidden abuse heuristics, counterparties, or private cohort membership.
- Operator review is least-privilege: review queues are redacted by default, and exact-field reveal is just-in-time, field-scoped, reason-coded, role-limited, time-bounded, audited, and unavailable for bulk browsing/export.
- Automated delegate runs may create only redacted, participant-owned internal artifacts such as opportunity briefs, receipts, stale transitions, budget reservations, and retention-cleanup actions after all hard gates pass. Human/operator review remains required before disclosure, contact, reliance, counterparty-facing notification, intro-review approval, or any non-redacted/counterparty-affecting state change.
- Scoped emergency stops are hard blockers. Active emergency controls can pause or cancel runs, suppress notifications, block surfacing and intro advancement, and make affected artifacts stale or emergency-paused; releasing a stop requires recomputation from valid inputs before action resumes.
- Runtime safety tripwires provide continuous fail-closed monitoring for known invariant failures and severe aggregate anomalies. Blocking tripwires activate scoped emergency controls or pause affected lanes; tripwire logs and summaries are redacted and are not matching inputs.
- Policy-critical code and governed artifacts are tied to release/config manifests. Routes, workers, schemas, registries, feature flags, tool capabilities, retention jobs, and documentation must not drift silently across deployments.
- Subject identity and automation status are disclosed through sanitized broad labels where needed for meaningful consent. Organisations, collectives, automated agents, service accounts, and partner/operator seats require current authority and human accountability, and must not masquerade as ordinary individuals.
- High-dependency and power-asymmetric contexts use explicit safeguards. Funder/grantee, employer/applicant, clinician/client, legal or immigration adviser/client, landlord/tenant, mentor/mentee, platform admin/user, regulator/regulated-party, and similar contexts require configured review and neutral consent flows before intro advancement or disclosure.
- Tripwire signals are classified by trust level. User-controllable aggregate signals such as report spikes cannot by themselves trigger broad emergency stops or deplatforming; broad containment requires trusted corroboration or operator-confirmed evidence and must use the narrowest justified scope.
- Opportunity briefs snapshot dependencies and become non-actionable when the authorization, source summary, profile version, candidate exposure setting, candidate discoverability, cohort scope, or expiry state becomes stale.
- Candidate profiles are scored or surfaced only when the candidate's separately confirmed, unexpired inbound-delegate exposure settings authorize delegate-mediated discovery for the relevant purpose code, audience scope, cohort, and broad surfaces; ordinary profile discoverability alone is not sufficient, and non-`off` exposure requires finite re-confirmation deadlines.
- Candidate-side surfacing budgets, pending-intro limits, and cool-offs are enforced across requesters and runs. Exhausted budgets block additional surfacing or intro advancement, budget updates are atomic/idempotent, counter rows are retention-bound, and budget status is exposed only coarsely in candidate-owned views or internal safety tooling. Requester-visible, exportable, or public surfaces may use only generic availability/budget categories that are bucketed, withheld, or aggregated over a sufficiently broad safe pool.
- Requesters never receive exact candidate-specific blocker reasons. Candidate opt-out, budget exhaustion, cool-off, cohort mismatch, privacy-stage conflict, retention state, prior dismissal/report, and similar candidate-specific gates are mapped to generic privacy/availability/safe-pool/review categories.
- Requester-visible blocker/factor counts and diagnostics are also coarsened. Generic categories must be bucketed, withheld, or aggregated so requesters cannot infer exact numbers of candidates withheld for candidate-specific private reasons.
- No-result and timing behavior is also side-channel-safe. Requester-visible no-brief states, digest changes, queue timing, receipt sequence changes, retry timing, and notification absence must not let requesters infer whether a candidate exists or was filtered by a private candidate-specific gate.
- Candidate-dependency snapshots are internal-only. Candidate opt-in, discoverability, exposure-version, budget-version, cohort, retention/anonymization, and candidate-specific stale-cause fields may support server-side revalidation, but requester-facing stale labels and dependency explanations must stay generic.
- Requester-facing opportunity-brief APIs and UI use sanitized projections or server-side DTOs, not direct internal table rows. Internal candidate identifiers, candidate-dependency snapshots, exact blocker states, exact timing, and retention/anonymization causes are service-side only.
- Requester-facing payloads use versioned explicit allowlist schemas. Adding a new visible field requires a schema-version change, privacy review, and tests proving it does not expose candidate-specific gates, timing side channels, internal snapshots, or linkable identifiers.
- Intro requests derive their internal counterparty only from a valid active opportunity brief after server-side hard-gate revalidation. Requesters cannot supply or receive counterparty identifiers before mutual consent, and requester-facing intro status uses sanitized generic labels.
- Intro-request creation is idempotent. Repeated interested feedback, duplicate submissions, retries, or replays for the same requester-owned brief and purpose-code/version pair return the same sanitized state or a generic conflict rather than creating duplicate intro requests, receipts, budget reservations, operator tasks, or notifications.
- Counterparty-facing intro-consent requests also use sanitized projections and minimum-necessary broad context. Before mutual consent, they must not reveal requester exact identity, contact details, exact wishes, source notes, private cohort membership, exact requester strategy, exact targeting reason, or internal requester/candidate identifiers unless a later field-level grant permits it.
- Counterparty-facing intro-consent reminders are system-controlled, rate-limited, budgeted, generic, and side-channel-safe; requesters cannot trigger reminders or observe reminder engagement state.
- Post-mutual-consent exact detail disclosure uses explicit, field-level, purpose-bound, time-bounded, revocable, non-transitive disclosure grants. Mutual consent alone does not create broad or permanent access.
- Partner-matchmaker lanes are named, scoped grants, not privileged registry access. Partner systems and staff receive only sanitized projections and cannot run arbitrary searches or view internal candidate data.
- Collective profiles require current representative authority and member-data minimization. Private member-level information cannot become match input without that member's independent confirmation.
- Cross-account and partner-seat anti-probing controls prevent coordinated enumeration while remaining redacted, retention-bound, and unavailable to requesters.
- Payment tier, partner commercial priority, and engagement likelihood do not affect person ranking, surfacing, notification priority, intro advancement, or disclosure.
- Candidates are not notified or exposed to requester interest by mere scan, shortlist, or brief creation.
- Default rollout is cohort-, pilot-, or matchmaker-scoped; global cross-registry delegate runs are disabled unless separately reviewed.
- Promotion beyond staff/internal scope requires documented promotion-gate checks and rollback paths.
- There is no autonomous outreach.
- There is no raw private-feed mining.
- Exact details require consent grants.
- AI proposals are schema-bound and review-only before apply.
- Matching uses only participant-visible, schema-bound, explicitly confirmed broad fields and tags; hidden embeddings, latent preference vectors, unreviewed model summaries, and uninspectable derived features are not match inputs.
- Matchable fields and tags are classified by a maintained signal taxonomy. High-sensitivity or vulnerability-like signals require extra confirmation, purpose compatibility, review gates, and genericized outputs; they do not create urgency or ranking boosts because they expose vulnerability.
- Participants can create private block, mute, do-not-match, no-reminder, or no-recontact preferences where supported. These suppress future surfacing and intro paths without revealing the preference to counterparties or requesters.
- Cached projections, queued notifications, digest entries, exports, browser/client storage, and outbox rows are short-lived and revocation-aware; they are revalidated before render/send/download and purged or stale-marked when consent, exposure, block, grant, emergency, source, or retention state changes.
- Development, staging, CI, demos, replay, screenshots, and model-evaluation corpora use synthetic or formally redacted fixtures by default; production background-networking data is not copied into non-production workflows except through scoped incident/legal processes.
- Matching does not reward oversharing. Score can use only a capped confirmed-signal sufficiency check; more private detail, more source summaries, more free text, more confirmed tags, retained history, or source variety must not improve ranking once sufficiency is met.
- Feedback and action events are not implicit profile-learning signals. Requester, candidate, and counterparty views, dismissals, accepts, declines, ignores, reports, request-more-context actions, intro requests, clicks, dwell time, budget/exposure pauses, notification interactions, and receipt opens may affect action/retention/burden-control/safety state, but cannot affect matching unless the relevant person explicitly confirms a schema-bound broad profile update.
- Source-summary proposed or derived tags are not match inputs until explicitly confirmed; any legacy `derived_broad_tags` field is proposal-only and must not influence matching.
- Source-summary approval and tag confirmation are separate: approving a summary does not make any proposed tag matchable unless the user explicitly confirms that specific broad tag or an explicitly displayed batch of tags.
- Private third-party data in source summaries or imports is not a match input. A user's possession of text about someone else does not create permission to profile or match on that person's wishes, constraints, vulnerabilities, affiliations, capabilities, strategy, or contact details.
- LLM-assisted paths use no-training/no-retention or local/tenant-isolated equivalent modes and fail closed when those guarantees are unavailable.
- Source summaries are approved, revocable, and retention-bound.
- Helper runs are probe-resistant: minimum eligible-pool floors, dedupe windows, cross-route / abuse-principal probing budgets, side-channel-safe no-result behavior, and count bucketing prevent enumeration. Abuse metadata used for this purpose is internal, minimized, short-retention, and not a match input.
- Redacted delegate receipts explain participant-visible run/brief/intro events without exposing private data.
- Linkable candidate references, direct candidate/counterparty UUIDs, stable candidate hashes, and free-text artifacts have explicit retention windows and are deleted, cleared, or anonymized after participant review, safety-review holds, or legal obligations no longer require them.
- Retention holds are separate, scoped, time-bounded, owner-assigned, field-minimized review artifacts. A hold may delay cleanup for the stated safety/legal purpose, but it cannot make stale artifacts actionable, reverse anonymization, repopulate identifiers, or feed matching/notification/intro flows.
- Private-overlap computation remains design-only unless a separate crypto/privacy review has already been completed in the repository.

---

## `background-safety-blocker-taxonomy.test.ts`

Verify:

- delegate runs, scoring, opportunity creation, notifications, intro advancement, disclosure, partner/federation callbacks, exports, telemetry, and aggregate reports validate against the active safety-blocker taxonomy version/hash
- illegal, coercive, collusive, price-fixing, fraud, harassment, doxxing, extortion, intimidation, sanctions-evasion, harmful-dual-use, unsafe-reliance, and other configured harmful-coordination blockers suppress opportunity creation regardless of score
- requester/counterparty/partner/export/telemetry surfaces receive only generic safe reason codes and never exact blocker evidence, hidden abuse heuristics, source text, candidate existence, or private cohort membership
- same-version in-place mutation, stale docs, partial taxonomy materialization, client/partner/operator-supplied blocker claims, or safety-blocker taxonomy hash mismatch fail closed

## `background-queue-freshness-backpressure.test.ts`

Verify:

- queued delegate runs, scoring jobs, notifications, digests, intro prompts, exports, cache renders, partner callbacks, telemetry emits, and retention jobs snapshot queue-freshness controls and maximum age at enqueue time
- expired, stale-dependency, wrong-manifest, wrong-lane, wrong-output-schema, or backpressured work stales, cancels, recomputes, or drains through generic states rather than sending delayed catch-up notifications or advancing old artifacts
- queue-health telemetry is aggregate/redacted and does not expose exact run timing, candidate-specific gates, hidden blocker reasons, raw source text, exact wishes, or private cohort membership
- same-version mutation, stale docs, partial bundle materialization, or queue-freshness control hash mismatch fails closed

## `background-decline-exit-ux.test.ts`

Verify:

- opportunity, intro, disclosure, renewal, counterparty-prompt, and notification-preference screens expose low-friction decline, not-now, let-expire, pause, or revoke paths where the action is optional
- decline/no-reason exits do not require free text, do not use confirm-shaming, do not use loss-framed or urgency copy, and do not visually hide the safer narrowing choice beneath engagement-oriented actions
- requester/counterparty outputs map declines, ignores, timeouts, and not-now states to generic non-disclosing labels and side-channel-safe timing
- declines, ignores, timeouts, and not-now actions do not become reputation, popularity, quality, engagement, or matching signals except through explicit participant-confirmed profile updates or redacted safety workflows

## `background-operator-review-quality.test.ts`

Verify:

- high-impact operator-review lanes use active quality-control records where configured, including calibration cases, second-review sampling, disagreement escalation, reveal-rate thresholds, and reviewer training expiry
- calibration and sampling use synthetic or formally redacted cases by default and do not expose raw source text, exact wishes, candidate identities, private cohort membership, or hidden abuse heuristics to broad reviewer groups
- reviewer-quality metrics remain aggregate/redacted and cannot become candidate reputation, requester quality scores, partner priority, payment priority, engagement optimization, or match inputs
- disagreement handling produces generic review/unavailable/stale states for participants unless exact detail is later disclosed through a valid field-level grant

## `background-plain-language-term-map.test.ts`

Verify:

- every enabled participant-facing Background Delegate screen uses active plain-language term-map entries from the current UI-copy bundle for default action labels, headings, status labels, consent dialogs, opportunity cards, intro prompts, receipts, notification preferences, correction/export flows, and privacy-freeze controls
- default participant-facing UI does not expose implementation jargon such as policy decision, bundle hash, manifest, candidate handle, artifact transition, retention hold, anti-probing gate, rare-combination check, or internal blocker unless the user explicitly opens a sanitized technical-details panel
- simplified labels preserve the required distinctions between “find opportunities for me” and “let others find me,” possible opportunity and introduction, source-summary approval and tag confirmation, mutual consent and exact disclosure, pause/revoke/freeze, and future-access revocation versus retroactive erasure
- every high-impact action-bearing screen shows the required “what happens,” “what stays hidden,” and “how to stop or change it” elements from active copy keys, without urgency, scarcity, popularity, shame, engagement nudges, or unsafe euphemisms
- technical-details panels are sanitized, non-enumerating, and generated from server-derived DTOs; they do not reveal candidate-specific gates, hidden blockers, rare-combination internals, abuse heuristics, exact counterparties, or raw source text


# Definition of done

Use this section in a phase-scoped way. The full mature system is complete only when every bullet below is satisfied by working implementation. A Phase 0, Phase 1, Phase 2, or Phase 3 build is complete only when all bullets that apply to enabled surfaces in that phase are satisfied, and every future-phase bullet is satisfied by explicit fail-closed stubs, disabled routes/workers/UI, policy-denial tests, documentation of non-support, and absence of partial wiring. A future-phase feature must not be treated as implemented merely because a table, type, route shell, UI placeholder, or skipped test exists.

The current build phase is complete only when:

- The current implementation phase is explicit, server-side, governed, and bound into the active release/config manifest. Unsupported or future-phase background-networking lanes fail closed through disabled stubs, generic responses, policy-decision denials, feature-flag defaults, documentation, and tests; no partial route, UI, worker, partner callback, queue, export, telemetry, LLM path, source-summary path, vault path, disclosure path, or federation path can accidentally produce matching, surfacing, notifications, diagnostics, exports, intros, or disclosure before its phase-specific gates are implemented and promoted. Docs, tests, feature flags, route registration, worker registration, and policy decisions must agree with the phase artifact; disagreement fails closed.
- Release/config manifests, phase-gate bundles, purpose-code registries, signal-taxonomy registries, claim-assurance taxonomies, retention-policy bundles, policy-composition bundles, artifact-transition policy bundles, policy-action-kind registries, output-schema bundles, and tool-capability bundles are validated by version and content hash before any enabled route, worker, queue consumer, outbox, export, telemetry builder, partner callback, LLM proposal path, vault path, or retention job can run. Same-version mutation, partial materialization, stale rows, unregistered lanes/actions/schemas/tools/retention classes/composition rules/transition policies, or code/docs/test drift fails closed rather than falling back to broad defaults.

- Matching, scoring, anti-probing, non-surfaced evaluation, receipts, diagnostics, policy decisions, and telemetry use run-scoped pseudonymous candidate handles; stable profile/account/contact identifiers are resolved only by a gated identity/contact service after a fresh policy decision.
- Participants can activate and later release an account-wide privacy freeze / panic pause; active freezes block in-scope outbound/inbound background networking, queued notifications, intro advancement, disclosure access, partner/federation outputs, exports, cache renders, and nonessential operator reveals, and requester/counterparty surfaces remain generic.
- Background-networking data cannot be used for model training, fine-tuning, embedding training, recommender training, behavioral personalization, ad targeting, growth ranking, engagement optimization, or product-analytics feature learning except through a separate explicit opt-in and risk-reviewed synthetic/redacted path that cannot create match inputs without normal confirmation and lineage.
- Participant data export/access flows use short-lived, encrypted, sanitized, versioned allowlist schemas and exclude candidate/counterparty identifiers, candidate handles, hidden blockers, exact gate outcomes, internal policy decisions, abuse heuristics, rare-combination internals, private cohort membership of others, raw source text, and third-party private data.
- Participant-facing Background Delegate UI is implemented as a task-based, server-state-derived, plain-language control center: onboarding is staged and default-off; outbound delegate authorization and inbound candidate exposure are separate; synthetic previews are isolated from live registry data; scope-broadening actions use current effective-permission previews; notification/digest preferences can narrow non-critical delivery; opportunity cards, intro prompts, receipts, export/correction flows, and freeze controls use sanitized screen-state projections under client-surface integrity controls; default labels come from the active plain-language term map with sanitized technical details available secondarily; disabled/stale/future-phase states are generic and non-enumerating; and high-impact flows show privacy-impact summaries and visible revoke/pause/freeze paths.
- Users can opt into a Background Delegate.
- Users can create, inspect, limit, explicitly renew, and revoke a delegate authorization with versioned purpose codes, surfaces, scope, budgets, confidence threshold, server-bounded expiry, and renewal/re-confirmation deadlines.
- The purpose-code registry is implemented as a single governed artifact; authorizations, candidate exposure confirmations, delegate runs, opportunity briefs, receipts, intro requests, UI labels, docs, and tests all validate against that same registry and fail closed on missing, deprecated, disabled, superseded, or materially changed codes.
- Multi-purpose delegate authorizations and candidate exposure settings store explicit per-purpose `{purpose_code, purpose_policy_version}` bindings; no implementation path treats one policy version as covering multiple purpose codes unless the registry explicitly defines that exact global versioning scheme.
- Non-staff and external-pilot delegate runs fail closed unless covered by a current approved adversarial risk review for the exact purpose code, purpose-policy version, surfaces, and audience/cohort scope, with documented abuse/collusion analysis, notification review, retention review, LLM data-handling mode, rollback plan, and kill-switch owner.
- Non-staff, partner, federation, high-sensitivity, high-impact-claim, broader-cohort, and public-broad-preview lanes fail closed unless covered by a current approved pilot-evaluation and adversarial safety-case record with pre-registered utility/safety/privacy/burden thresholds, passed shadow/canary checks where required, explicit sunset/rollback rules, and any required independent red-team signoff.
- Operator/admin and break-glass actions are non-waiver safety actions only: they can narrow, suppress, quarantine, mark stale, reject, or approve a next step after all hard gates pass, but cannot override consent, purpose-policy compatibility, risk-review coverage, anti-probing, stale-state, retention/anonymization, RLS, encryption, notification, or explicit-signal matching requirements.
- High-impact governance and safety changes require the configured separation-of-duties approval path; ordinary admins, operators, feature flags, fixtures, and break-glass paths cannot self-approve purpose broadening, external risk-review approval, public-broad-preview enablement, partner-grant activation, emergency-stop release, tripwire disabling, aggregate-release approval, vault-reveal policy change, production-data exception, or broad retention hold.
- Delegate runs, workers, LLM proposal helpers, and partner-service callbacks execute only inside registered tool-capability sandboxes; unregistered network/write/contact/calendar/payment/vault-decrypt/code-execution tools fail closed.
- High-impact participant actions require current step-up authentication or repository-equivalent reauthentication, and active account-security holds pause high-impact authorizations, exposures, budget widenings, sensitive signal confirmations, vault reveals, disclosure grants, queued sends, and cached payloads.
- Participant correction/appeal workflows exist for the participant's own profile, source summaries, tags, exposure settings, authorizations, safety preferences, entity-resolution claims, disclosure grants, and generic denial categories, and accepted corrections stale dependent lineage, artifacts, policy decisions, caches, exports, and receipts without revealing candidate-specific private facts.
- Operator review workbenches are redacted by default; exact field reveal is just-in-time, field-scoped, reason-coded, role-limited, time-bounded, audited, and unavailable for bulk browsing, bulk export, unrestricted search, analytics reuse, or debug serialization.
- Operator-review quality controls are redacted and calibrated. High-impact review lanes must use synthetic or formally redacted calibration cases, blinded second-review sampling where configured, disagreement escalation, reveal-rate monitoring, stale/overrule audits, and reviewer training/expiry records. These controls may improve safety and consistency, but must not expose raw source text, exact wishes, candidate identities, private cohort membership, or become candidate/requester ranking, partner-priority, or engagement metrics.
- The implementation clearly separates automated redacted internal artifacts from human-reviewed external effects: redacted brief/receipt/stale/budget/cleanup actions can run after hard gates pass, while disclosure, contact, reliance, counterparty-facing notification, intro-review approval, and non-redacted/counterparty-affecting state changes remain review- and consent-gated.
- Scoped emergency controls exist for global, purpose-code, purpose-policy-version, surface, audience-scope, cohort, notification-path, LLM-mode, and retention-class incidents; active controls fail closed for in-scope runs, surfacing, notifications, feedback advancement, and intro creation, and release requires recompute from currently valid inputs.
- Runtime safety tripwires exist for known invariant failures and severe aggregate anomalies; blocking tripwires activate scoped emergency controls or pause affected lanes, cannot be bypassed by feature flags, fixtures, operator/admin actions, or break-glass states, and use only redacted aggregate signals.
- Tripwire signal-trust classes and anti-DoS limits are enforced: user-controllable aggregate signals cannot alone trigger global, public-broad-preview, whole-purpose, whole-cohort, candidate-exposure-revocation, or broad deplatforming actions, and any broad containment based partly on those signals requires trusted corroboration or operator-confirmed evidence.
- Each delegate run uses exactly one allowlisted purpose code under a stable purpose-policy version selected from explicit per-purpose authorization and candidate-exposure bindings, and opportunity briefs, receipts, and intro requests inherit that same code and version without purpose substitution or semantic reinterpretation.
- A centralized policy-decision layer is implemented and enforced across requester-facing routes, workers, notification builders, cache renderers, exports, telemetry builders, operator approval paths, disclosure-grant paths, partner callbacks, vault reveal paths, governance paths, and retention cleanup jobs. Every action kind is active in the governed policy-action-kind registry and every emitted payload schema is active in the content-addressed output-schema bundle, bound to the correct lane, side-effect class, actor role, schema, manifest, and single-use/idempotency requirements; missing, stale, wrong-action, unregistered-action-kind, catch-all-action-kind, wrong-output-schema-bundle-hash, client-supplied, or expired policy decisions fail closed.
- Overlapping controls compose least-permissively. When authorizations, exposure settings, disclosure grants, safety preferences, freezes, holds, emergency stops, tripwires, partner/federation grants, subject-identity authority, vault policy, output schemas, and rollout rules overlap, the effective permission is the narrowest active scope; ambiguity or conflict fails closed.
- Background-networking artifacts follow governed state machines. Stale, closed, expired, redacted, anonymized, revoked, declined, frozen, deleted, and released artifacts cannot be made actionable again by admin tools, retries, rollbacks, migrations, or restores; action resumes only by recomputing a new artifact from currently valid inputs.
- Policy-critical code and governed artifacts are bound into current approved release/config manifests; stale, revoked, wrong-scope, wrong-environment, wrong-output-schema-bundle-hash, wrong-schema, wrong-tool-capability, or wrong-migration manifests fail closed, and rollback cannot resurrect stale consent, deprecated purpose semantics, disabled tools, retired schemas, or anonymized identifiers.
- Subject identity and automation status are authority-bound and non-deceptive. Organisations, collectives, automated agents, service accounts, and partner/operator seats require current authority, human accountability, sanitized subject-kind labels where needed, and ordinary consent before exact identity/contact disclosure.
- High-dependency and power-asymmetric relations trigger configured safeguards before opportunity creation, intro advancement, counterparty prompts, reminders, or disclosure; safeguards are neutral, side-channel-safe, and never used for urgency, vulnerability, payment, or engagement boosting.
- Raw source text, exact source summaries, exact wishes, contact fields, private constraints, exact disclosure-granted fields, and operator-reveal payloads are isolated in an encrypted participant-owned vault or repository-equivalent sensitive-field store; matching, telemetry, analytics, public reports, and ordinary UI/API paths cannot decrypt or read them.
- Aggregate analytics, partner reports, public reports, telemetry exports, measurement queries, and research extracts pass through approved content-addressed aggregate-release controls with minimum cohort thresholds, differencing protections, suppression/noise where needed, manifest-bound policy hashes, and no ad-hoc analyst access to internal rows.
- Users can create/apply a structured wish profile.
- Every matchable profile field, confirmed tag, source-summary signal, collective signal, partner-grant signal, and disclosure-grant-derived broad field has active match-input lineage; stale, orphaned, retention-expired, revoked, wrong-taxonomy, or wrong-purpose lineage fails closed and marks dependent artifacts stale.
- Candidate identity, organization, and collective resolution are conservative and consent-bound; imported aliases, public mentions, partner records, contact-book data, model-suggested duplicates, and disputed/stale claims cannot create candidates, dedupe profiles, or disclose counterparties.
- Requester-facing and counterparty-facing opportunity briefs, intro prompts, receipts, exports, diagnostics, telemetry, partner reports, and public reports pass quasi-identifier / rare-combination checks over the complete payload.
- High-impact consent flows for public exposure, partner-matchmaker exposure, high-sensitivity/vulnerability signals, collective authority, budget widening, vault decrypt reveal, and field-level disclosure grants have no-dark-pattern UI, explicit consequence summaries, and server-recorded comprehension/confirmation events.
- Users can separately confirm, inspect, renew, narrow, pause, and revoke inbound delegate discovery and inbound purpose codes for their own profile, with default-off behavior for new, imported, migrated, reactivated, and privacy-reset profiles; non-`off` exposure has finite expiry / re-confirmation deadlines and expired exposure fails closed.
- Users can set, inspect, narrow, pause, and explicitly widen candidate-side surfacing budgets, pending-intro limits, and cool-off settings; exhausted budgets are hard blockers across requesters and runs, counter updates are atomic/idempotent, counter rows are retention-bound with active-only candidate identifiers, and budget status is visible only as coarse state in candidate-owned views or internal safety tooling, never as requester-visible/exportable candidate-specific budget state.
- Requester-facing briefs, receipts, diagnostics, notifications, APIs, telemetry, and docs do not reveal exact candidate-specific blocker reasons; they use generic privacy/availability/safe-pool/review categories for candidate opt-out, budget, cool-off, cohort, privacy-stage, retention, prior-dismissal/report, and similar gates.
- Requester-facing blocker/factor counts, receipt aggregates, diagnostics, and telemetry exports are bucketed, withheld, or sufficiently aggregated so exact candidate-specific gate counts and deltas cannot be inferred.
- Requester-facing no-result, no-brief, withheld, blocked-run, receipt-timing, queue-timing, digest-delta, retry-timing, and notification-absence behavior cannot be used to infer candidate existence or candidate-specific gate outcomes; probing budgets aggregate across route families, manual scans, no-result surfaces, receipt/intro polling, requester accounts, organization/cohort roles, and repository-standard abuse principals where privacy policy permits.
- Candidate-dependency snapshots are internal-only and requester-facing dependency/stale labels are generic; candidate opt-in, discoverability, exposure-version, exposure-expiry, budget-version, cohort, retention/anonymization, and candidate-specific stale-cause fields are not exposed through requester-facing APIs, receipts, exports, diagnostics, notifications, telemetry, or docs.
- Requester-facing opportunity-brief APIs, UI, receipts, exports, diagnostics, and telemetry are generated from sanitized projections/DTOs that physically exclude internal-only columns; ordinary authenticated users cannot read internal opportunity-brief rows or columns containing active candidate identifiers, candidate-dependency snapshots, exact blocker states, exact timing, or retention/anonymization causes.
- Requester-facing opportunity-brief, receipt, diagnostic, export, telemetry, cache, and UI-hydration payloads are validated against content-addressed, versioned explicit allowlist schemas bound to the active release manifest; extra keys, newly added internal columns, ORM relation objects, debug metadata, same-version schema mutations, schema-hash mismatches, and schema-spread fields cannot reach requester-visible surfaces.
- Background-networking intro requests derive internal counterparties only from valid active opportunity briefs after server-side hard-gate revalidation; requester-facing intro creation/status payloads never accept or expose counterparty identifiers, exact candidate-specific gates, exact decline/expiry reasons, operator notes, or timing-sensitive internal fields before mutual consent.
- Background-networking intro creation is idempotent and single-active per requester-owned opportunity brief and inherited purpose-code/version pair; retries, duplicate submissions, double-clicks, and worker replays cannot create duplicate intro requests, receipts, budget reservations, operator tasks, notifications, or distinguishable candidate-specific status/timing signals.
- Counterparty-facing intro-consent notifications and payloads are generated from separate sanitized projections/DTOs that expose only broad purpose, broad requested disclosure categories, generic rationale, generic operator-review status, coarse review-window bucket, and safe choices before mutual consent; requester exact identity, contact details, exact wishes, source notes, private cohort membership, exact targeting reasons, and internal identifiers remain hidden unless a later field-level grant permits disclosure.
- Counterparty-facing intro-consent reminders are system-controlled, rate-limited, budgeted, generic, and side-channel-safe; requester clients cannot trigger reminders or observe exact reminder delivery/open/click/ignore/timeout/decline/report state.
- Exact post-mutual-consent detail disclosure is mediated by explicit field-level disclosure grants that are purpose-bound, time-bounded, revocable, non-transitive, retention-bound, and generated through versioned allowlist schemas; mutual consent alone does not create broad or permanent exact-detail access.
- Partner-matchmaker lanes require named active grants, sanitized partner-facing projections, redacted partner/operator access logs, quota enforcement, and revocation/staleness behavior; partners cannot access raw registry rows or arbitrary query interfaces.
- Collective profiles, if supported, require current representative authority and member-data minimization; member-level private data cannot be matched or disclosed without each member's independent confirmation.
- Cross-account / sybil-aware anti-probing and partner-seat anti-probing block materially equivalent enumeration attempts without creating broad persistent fingerprinting or requester-visible anti-abuse signals.
- Payment tier, partner commercial priority, sponsorship, and engagement likelihood are excluded from eligibility, scoring, surfacing, notification priority, intro advancement, and disclosure.
- All matchable fields and tags pass a current content-addressed signal-taxonomy gate; high-sensitivity or vulnerability-like signals are handled through explicit extra confirmation, purpose compatibility, risk-review/operator-review requirements where configured, genericized outputs, and no vulnerability/urgency scoring boost.
- Participant-controlled block, mute, do-not-match, no-reminder, and no-recontact preferences are implemented as internal hard gates, suppress dependent matching/intro/reminder/disclosure paths, invalidate stale artifacts, and never reveal preference existence or exact reason to requesters/counterparties.
- Revocation-aware cache/outbox/client-storage controls invalidate queued notifications, digests, exports, UI hydration payloads, browser/client storage, and cached sanitized projections before render/send/download when relevant consent, exposure, grant, block, emergency, source, or retention state changes.
- Development, CI, staging, demo, replay, screenshot, and model-evaluation workflows use synthetic or formally redacted fixtures by default, and tests prevent production background-networking rows or sensitive artifacts from entering non-production datasets without a scoped incident/legal approval artifact.
- Users can approve/revoke source summaries with retention and allowed-field controls.
- Delegate runs generate deterministic privacy-safe opportunity briefs only within active authorization and cohort/matchmaker scope.
- The deterministic matching path uses only participant-visible, schema-bound, explicitly confirmed broad fields and tags; hidden embeddings, latent preference vectors, unreviewed model summaries, and uninspectable derived features cannot influence eligibility, scoring, surfacing, notifications, feedback advancement, or intro requests.
- Matching uses capped confirmed-signal sufficiency rather than profile completeness; additional private detail, source-summary volume, free text, confirmed tag count, retained history, or source variety cannot increase score after sufficiency is met.
- Feedback and action events do not silently become matching signals: requester, candidate, and counterparty views, dismissals, maybe-later decisions, accepts, declines, no-reason exits, ignores, timeouts, reports, request-more-context actions, intro requests, clicks, dwell time, budget/exposure pauses, notification interactions, and receipt opens can affect only action/retention/cool-off/burden-control/intro/receipt/safety state unless the relevant person explicitly confirms a schema-bound broad profile update. Optional decline/not-now/let-expire paths are low-friction, non-coercive, and generic to the other side.
- Source-summary tags have a clean proposal/confirmation boundary: source-summary approval alone is not tag confirmation; `unconfirmed_derived_tags` are proposal-only, `confirmed_broad_tags` with explicit per-tag confirmation records are the only source-summary tags usable for matching, and any legacy `derived_broad_tags` field is proposal-only or migrated away.
- Private third-party data in source summaries, imports, manual notes, email/calendar excerpts, public URL summaries, or chatbot history cannot become a match input; third-party wishes, constraints, vulnerabilities, affiliations, capabilities, strategy, or contact details require that third party's own independent profile/exposure confirmation.
- Opportunity briefs snapshot authorization, profile, source-summary, candidate-exposure, candidate-discoverability, cohort, and expiry dependencies.
- Stale briefs cannot notify, advance to intro requests, create disclosure grants, or otherwise remain actionable.
- Prohibited-coordination, purpose-mismatch, purpose-policy-version mismatch, anti-enumeration, anti-probing, uncertainty-gating, candidate-exposure, candidate-budget, privacy-stage, revocation, and safety blockers from the active safety-blocker taxonomy suppress opportunity creation regardless of score.
- Pending work is freshness-bound and backpressure-aware. Delegate runs, scoring jobs, outbox rows, digests, notifications, intro prompts, exports, cache renders, and retention cleanup jobs must carry lane-specific maximum age, dependency snapshots, and queue-freshness state. If work exceeds its freshness window or a queue-health gate fails, it must stale, cancel, recompute, or drain silently through side-channel-safe generic states rather than sending delayed catch-up notifications, advancing old artifacts, or revealing backlog timing.
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
- Rollout gates block promotion when privacy, prompt-injection, unsafe-notification, accessibility, queue-freshness/backpressure, pilot-evaluation, adversarial-safety-case, safety-blocker taxonomy, backup/restore, federation, conflict-recusal, operator-review quality, shadow/canary, or rollback tests fail.
- High-impact claim-assurance records, ephemeral non-surfaced candidate evaluation, retention-aware backup/restore, federation/bridge boundaries, reviewer conflict-recusal, and pilot-evaluation safety-case gates are implemented and tested.
- All tests pass.
- Public docs and contract routes accurately reflect the behavior.

---

# Explicit non-goal: production private-overlap crypto

Build the delegate/opportunity-brief loop now. Do **not** build production private-overlap crypto in this task.

Moral Trade’s public private-overlap gate says private overlap is design-only, live endpoints are blocked pending cryptographic review, and future storage should be blinded-token-only with raw/canonical tags forbidden.

Forethought itself treats the privacy/surveillance/collusion tradeoff as unresolved and important. The safer concrete mechanism is therefore to generate reviewable opportunity briefs from approved broad signals, within explicit delegate authorizations and scoped pilot communities, rather than expose richer hidden matching infrastructure immediately.
