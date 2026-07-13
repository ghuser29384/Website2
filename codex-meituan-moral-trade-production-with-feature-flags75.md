# Codex GPT-5.5 Extra High task: implement a production-grade Meituan / Taobao / Dianping / Xianyu / X-inspired Moral Trade marketplace — v75 active implementation spec

> v75 is an **active-only cross-perspective-context-note pass** on top of v74. It adds exactly one new app-inspired pattern from X/Twitter: a Moral Trade version of Community Notes, implemented as **Cross-Perspective Context Notes** for claim-scoped, source-backed, bridge-reviewed context. It preserves v74's Role-Scoped Trust Snapshot, implementation freeze, current-state patch loop, compact Browse shelf, adjacent receipt atom, object-first routes, private owner rows, and rendered-evidence requirement. It does **not** add a social feed, comment system, public reputation layer, ranking system, backend moderation system, screen family, proof framework, receipt framework, or acceptance-gate object. Use this file alone as the active instruction. Do not reconstruct or consult v1-v74 unless a human explicitly asks for historical context.

## v75 improvement summary: what changed and why

v74 is directionally correct because it adds Xianyu-style transaction trust only as a role-scoped Trust Snapshot, not as a public credit score. It can still take one more useful piece of inspiration from **X/Twitter**: Community Notes-style context, especially the idea that a note should become visible only when it is helpful across different perspectives rather than merely popular with one side.

The Moral Trade version must not copy X's social-media dynamics. Moral Trade should not add public comments, replies, likes, reposts, quote-post fights, trending notes, contributor clout, virality ranking, or engagement-based feeds. Instead, v75 adds **Cross-Perspective Context Notes**:

* claim-scoped, not person-scoped;
* source-backed, not vibes-backed;
* bridge-reviewed where infrastructure exists, not simple-majority rated;
* explanatory, not a platform verdict;
* subordinate to the receipt atom, never a replacement for state/exposure/condition/CTA facts;
* challengeable through private support/review, not public argument;
* omitted or SafeStated when backing is missing.

Credence that v75 improves v74 for trust-sensitive moral coordination: **0.54**. The benefit is better handling of contested factual context, assumptions, guide rules, trust labels, evidence examples, and estimate caveats without making the platform the moral authority. The risk is that context notes could become a comment/rating layer, so v75 confines them to **Explain** or **Support** below the first object and forbids social engagement mechanics.

## v75 design changes

| v75 design | Purpose / improvement | Specific UX/UI Codex should build or verify | Primary CTA rule | Omit / simplify when |
|---|---|---|---|---|
| **Cross-Perspective Context Notes** | Adds the only remaining high-value X/Twitter inspiration: Community Notes-style context, translated into claim-scoped, source-backed, bridge-reviewed explanation rather than social commentary. | Show a compact **Context note** chip or one collapsed **Explain** row only where backed: offer/detail claim, guide rule, trust snapshot, DealScout comparison, estimate/caveat, evidence example, or terms-change context. Opening it shows the claim, context, sources, perspective coverage if backed, missing information, last checked, limitations, and private challenge/propose path. | Context Notes never own the item CTA. They may expose **View context**, **Report context issue**, **Back**, or **Contact support** only as secondary Explain/Support actions. | Omit if source owners are absent, if bridge-review/support infrastructure is absent and no reviewer/source-backed note exists, if it would crowd the first object, or if it would become a comment thread. |
| **Bridge-reviewed, not majority-ranked** | Preserves the useful X algorithmic idea while preventing popularity capture. | A note may say **Bridge-reviewed context** only if contributors/reviewers from sufficiently different declared perspectives or role groups rated it helpful under a backed process. Simple majority, likes, replies, or engagement are insufficient. If no bridge process exists, use **Source-backed context** or omit. | No primary CTA. Bridge status cannot upgrade an item action. | Do not show **community agrees**, **viral**, **trending**, **most liked**, **ratioed**, or contributor-score copy. |
| **Context source ledger** | Makes context notes auditable instead of black-box moderation. | Context detail order: title **Context note** → claim/surface affected → short note text → sources/facts used → facts missing → perspective coverage or **No bridge review** → last checked/source owner → affected receipt/guide/trust field → limitation **Not a verdict** → optional private challenge. | Secondary CTA only. | Do not use anonymous allegations, unreviewed comments, private disputes, social graph, follower status, engagement, or hidden model features as context. |
| **No X-style social layer** | Blocks the main harmful X/Twitter inspiration: engagement and public argument. | There is no public reply thread, quote-post, like count, repost count, follower badge, contributor leaderboard, public note battle, or global trending context lane. Context appears only as a compact decision aid under the current object. | No primary CTA. | If a proposed feature needs comments, public debate, public votes, public contributor status, or trend ranking, omit it. |
| **Context challenge path** | Converts disagreement into private support/review, not public shaming. | Inside Context Note details, **Report context issue** uses reason chips: **Context seems wrong**, **Source outdated**, **Missing important context**, **Not relevant to this trade**, **Privacy concern**, **Other**. Optional note is private/support-scoped. Result is backed support/review row or SafeState. | **Submit issue** only if backed; otherwise **Contact support** or **Back**. | No public correction badge, public accusation, automatic re-ranking, public penalty, or direct counterparty chat. |
| **Context does not rank or decide** | Prevents Community-Notes-like context from becoming hidden platform authority. | A Context Note may explain a claim or caveat, but cannot silently alter feed/search/guide/DealScout rank, Trust Snapshot label, eligibility, or CTA. If context reveals stale terms, the authoritative adapter must update the receipt atom before any CTA changes. | Receipt atom and source adapters still own CTA. | Do not use context notes as evidence acceptance, reviewer approval, moral truth, eligibility pass, or rank boost. |
| **Role-Scoped Trust Snapshot** | Adds the only remaining high-value Xianyu-like inspiration: transaction trust, but avoids importing broad personal credit scoring. | Show a compact trust/readiness indicator only where backed: card chip, detail **Trust snapshot** Explain row, private row line, Account **Your role readiness** row, or support/review row. It summarizes role-specific facts such as **Role verified**, **Credential current**, **History limited**, **Issue pending**, or **Credential stale**. | Trust Snapshot never owns the item CTA. It opens **View trust details** or **Report trust issue** only as secondary Explain/Support. | Omit if source owners are absent, if it would crowd the first object, or if it would require a universal score. |
| **No public credit score** | Prevents Xianyu-style credit from becoming moral status, social proof, or algorithmic pressure. | Do not show public numeric scores, **信用极好**, **low trust**, **green pass**, badges that imply moral worth, or score-driven ranking. Use categorical role facts and source rows. | No primary CTA. | If product asks for a score, degrade to **Trust data unavailable** or **History limited** until backed role facts exist. |
| **Trust source ledger** | Makes the trust indicator explainable and challengeable instead of a black box. | Trust details sheet/inline row shows: role, facts used, facts missing, last checked, source owner, whether it affects eligibility/action, and limits. Example rows: **Reviewer credential current · checked May 2026**, **No completed commitments yet**, **One unresolved issue · support-owned**, **Not a guarantee**. | Secondary CTA only: **View trust details**, **Report trust issue**, **Back**. | Do not use private browsing/search/planner state, external consumer credit, demographics, social graph, education, job, income, or contacts. |
| **Trust challenge path** | Keeps trust data contestable, like after-sales correction rather than public ratings. | Inside trust details, show **Report trust issue** only when support/reviewer intake exists or can SafeState. Reason chips: **Trust label seems wrong**, **Credential stale**, **Wrong role**, **Issue already resolved**, **Missing context**, **Other**. | **Submit issue** only if backed; otherwise **Contact support** or **Back**. | No public complaint, public rating, automatic penalty, automatic re-ranking, or direct counterparty chat. |
| **Trust does not rank** | Prevents the snapshot from silently affecting guide/feed/search/DealScout rank. | If trust affects guide inclusion or action eligibility, disclose it in **Why shown?**, **Why this guide?**, or **Trust details**. It may block a live action only when a selected release explicitly requires that role check. | Item CTA follows receipt atom and revalidation, not trust score. | Do not use trust categories as hidden sort weights, popularity signals, or **best/reliable user** labels. |
| **Private self-readiness** | Gives users a useful Account/Xianyu-like “信用” analogue without public gamification. | Account may show **Your role readiness** as a private row: identity/auth state, creator/reviewer requirements, credential expiry, unresolved support blockers, draft/review readiness, and one next action. | Row CTA: **Fix requirements**, **View settings**, **Submit for review**, **Back to offers** where backed. | No ranks, coins, medals, perks, follower counts, public score, or growth-hack progress bars. |

## v75 canonical architecture rule

Codex must treat v75 as the only active Release A implementation shape.

1. **Use v75 alone.** Do not use v1-v74 as an active backlog, appendix, or feature catalogue.
2. **Freeze architecture except the Trust Snapshot and Cross-Perspective Context Note integrations.** The active work is route implementation and evidence. Do not create new route, proof, receipt, acceptance, or credit-scoring framework files solely to satisfy v75.
3. **Use existing code paths where possible.** Prefer existing display adapters, route components, constants, tests, page objects, Storybook stories, DOM checks, support rows, credential rows, context/source rows, reviewer notes, and final-report tables.
4. **Implement current state first.** Verified zero-live inventory gets a zero-live Browse route. Missing backing gets SafeState or omission. Unsupported variants are parked.
5. **Patch the earliest failing rendered route.** Do not touch optional variants while an earlier route in the patch loop fails.
6. **Browse has one compact shelf.** Search, one tab row, one context line, one combined rail, then first card/empty lane. No second rail or auxiliary above inventory.
7. **Non-Browse routes show the object first.** Only top controls may precede the receipt-bearing object.
8. **Receipt atom stays adjacent and source-owned.** Identity, state, exposure, condition/protection, CTA, result, and owner row come from authoritative source owners or intentionally degrade.
9. **Trust Snapshot is an Explain/Support subtype, not a route family.** It may appear as one chip, one collapsed Explain row, one private Account readiness row, or one support/review row. It never appears above the first object.
10. **Cross-Perspective Context Notes are an Explain/Support subtype, not a social layer.** They may appear as one card chip, one collapsed Explain row, one context row in guide/DealScout/trust details, or one private support/review challenge row. They never appear above the first object and never create comments, likes, reposts, or public votes.
11. **Auxiliary defaults to none.** If present, choose one: **Guide**, **Explain**, or **Support**, below the object. Trust Snapshot uses **Explain** unless the user explicitly enters support.
12. **CTA handoff may match or downgrade.** Card → detail → sheet can strengthen only after visible backed revalidation.
13. **Durable results sync to one owner row.** Plan, Track, Create, or Support owns durable rows. Account and Messages link unless backed as stricter row owners.
14. **Trust labels do not silently rank.** Trust Snapshot may explain eligibility/readiness, but it must not silently influence feed/search/guide/DealScout rank or appear as moral authority. Cross-Perspective Context Notes may explain claims/caveats, but they must not silently influence rank, eligibility, CTA, trust labels, or evidence acceptance.
15. **Completion requires evidence.** A route is not complete without rendered route evidence or stricter existing equivalent.

## v75 current-state patch loop

Implement and verify in this order.

| Step | Route / flow | Exact target | Stop condition |
|---|---|---|---|
| 1 | **Browse current state** | At 390px, show search, one tab row, one context line, one combined rail, first Template/Example card or empty lane, and bottom nav. Trust Snapshot or Context Note, if present, is at most one compact card chip and never above inventory. | Stop if the first card/empty lane is not visible and understandable before optional modules. |
| 2 | **First card → detail → sheet/SafeState** | Card opens detail. Detail shows economics receipt atom and footer. Footer opens preview sheet or SafeState. Sheet result copy is non-durable unless a real owner row exists. Trust details or Context Notes, if present, are below the receipt atom as **Explain**. | Stop if card/detail/sheet receipt facts disagree, CTA strengthens without backed revalidation, a trust label contradicts source state, or a context note contradicts the authoritative receipt without adapter revalidation. |
| 3 | **Direct-route safety** | `/offers/new?mode=offset`, stale detail, `/matches`, `/messages`, `/cart`, `/pledges`, and equivalent direct routes render receipt object, empty lane, SafeState, or safe redirect with no raw shell. | Stop if raw provider errors, partial forms, partial dashboards, credit-score pages, community-note/comment pages, or suspense-only route shells appear. |
| 4 | **Plan / Track current state** | Plan and Track show owner strip, one compact tabs/filter row if backed, first row or SafeState, one row CTA. Trust Snapshot can appear only if it explains the row's role/verifier/issue state. | Stop if private rows are duplicated across Plan/Track/Account/Messages, imply checkout/live state, or use trust/context labels as status/rank. |
| 5 | **Account / Create current state** | Account shows settings/links and may show private **Your role readiness** only if backed. Create opens option-receipt sheet before any form. | Stop if Account shows fake counts, credit score, perks, trust ranks, or Create routes to raw form first. |
| 6 | **Backed optional variants only** | Guide, Explain, Support, personalized, live, review, payment, receipts, DealScout, Trust Snapshot, and Cross-Perspective Context Note variants only if source owners and rendered gates already pass. | Stop if any optional variant crowds first object, creates unbacked state, or introduces a hidden score/ranking/comment effect. |

## v75 first-render decision

Every route first resolves one of these states before route-specific copy appears.

| Gate result | Exact UX/UI | CTA rule |
|---|---|---|
| **Receipt object** | Final slot order with adjacent receipt atom. Loading skeletons preserve final slots without route-specific claims. | Receipt CTA only. |
| **Empty receipt lane** | First object slot: title, one reason, optional receipt fragment, one recovery CTA. | **View templates**, **Browse offers**, **Change filters**, **Back to offers** where backed. |
| **Auth SafeState** | **Sign in required**, what remains unchanged, one CTA. After auth, revalidate and require a new tap. | **Sign in to continue**. |
| **Not-connected SafeState** | **Not connected yet**, one reason, one recovery CTA. | **Set up later**, **Back to offers**, or **Contact support** only if backed. |
| **Unavailable SafeState** | **Unavailable** or **Terms changed**, optional object fragment, one recovery CTA. | **Review current terms**, **Find similar**, **Remove**, **Back to offers**, or **Contact support** where backed. |
| **Safe redirect** | Redirect/link to generic `/offers`. | **Browse offers**. |
| **Trust unavailable** | If a trust snapshot was requested but source owners are absent, show **Trust data unavailable** inside Explain or omit entirely. | **Back** or **Contact support** only if backed. |
| **Context unavailable** | If a Context Note was requested but source owners, reviewer/source note, or bridge-review support are absent, show **Context unavailable** inside Explain or omit entirely. | **Back** or **Contact support** only if backed. |

## v75 controlled copy ledger

Use this ledger unless the repository already has stricter equivalent copy.

| Receipt / trust line | Allowed copy | Degrade to | Forbidden copy |
|---|---|---|---|
| **State** | **Live**, **Preview**, **Template**, **Example**, **Unavailable**, **Draft**, **Reviewing**, **Action needed**, **Done**, **Issue**, **Safe** | **Preview**, **Unavailable**, **Safe** | raw enums, feature flags, **Hot**, **Best**, **Popular**, **Deal**, **Claimed**, **Ready**, **All set** |
| **Exposure** | **Max $X**, **No charge now**, **Preview only**, **Exposure unknown**, **Not connected**, **Unavailable** | **Exposure unknown**, **Not connected**, **Unavailable** | hidden exposure, tooltip-only exposure, fake discount/savings/cheap/free copy |
| **Condition** | **Review required**, **No commitment**, **Terms changed**, **Sign in required**, **Eligibility unknown**, **Not connected**, **No durable state changed** | **Review current terms**, **Eligibility unknown**, **Not connected** | **success**, **joined**, **reserved**, **matched**, **order placed**, **approved**, **guaranteed** without exact backed state |
| **Protection/privacy** | **No commitment will be created**, **Private planning only**, **Lifecycle updates only**, **No counterparty chat**, **Authorization released if not cleared**, **Support intake not connected yet** | **Private planning only**, **Not connected** | fake refund guarantee, fake privacy guarantee, public proof, direct counterparty chat, hidden obligations |
| **Primary CTA** | **View details**, **Preview budget**, **Create similar**, **Create from template**, **Sign in to continue**, **Save draft**, **Submit for review**, **Authorize pledge**, **Commit conditionally**, **Review current terms**, **Fix requirements**, **View guide**, **Back to offers**, **Browse offers**, **Set up later**, **Contact support** | **View details**, **Review current terms**, **Back to offers**, **Browse offers** | **Buy**, **Join**, **Checkout**, **Claim**, **Grab**, **Hot deal**, **People like you**, **Best moral trade** |
| **Result** | **No durable state changed.**, **No commitment was created.**, **Added to planner. No commitment created.**, **Draft saved. No commitment created.**, **Submitted for review. No live commitment created.**, **Signed in. Review current terms before continuing.**, **Commitment created.** only after real mutation and authoritative row | **Could not confirm. Review current state.**, **No durable state changed.** | generic **Success**, fake order row, fake receipt, fake support code, fake queue, fake ETA |
| **Trust Snapshot** | **Role verified**, **Credential current**, **History available**, **History limited**, **Not enough history**, **Issue pending**, **Credential stale**, **Trust data unavailable**, **Support review needed** | **History limited**, **Trust data unavailable**, **Not connected** | numeric score, **信用极好**, **信用优秀**, **low credit**, **green pass**, **trusted user**, **best user**, **reliable person**, **bad actor**, **people like you**, rank boost, moral score |
| **Context Note** | **Context note**, **Source-backed context**, **Bridge-reviewed context**, **Needs review**, **Outdated context**, **Context unavailable**, **Not a verdict** | **Context unavailable**, **Needs review**, omit note | **fact checked** unless a formal fact-checking process exists, **true**, **false**, **debunked**, **community agrees**, **viral**, **trending**, **ratioed**, likes/reposts/replies/comments counts, contributor rank, moral verdict, hidden rank boost |

## v75 Role-Scoped Trust Snapshot

This is the v74 pattern retained in v75.

### Purpose

A Trust Snapshot helps a user understand whether a role in the current Moral Trade flow has backed reliability/readiness information. It is a transaction-safety aid, not a global user reputation score.

### Allowed source owners

Use only source owners that already exist or can be safely documented by the repository:

* credential / reviewer / verifier records;
* recipient or cause registry state;
* creator draft/review state;
* authoritative commitment / Track row history;
* support issue status;
* review / evidence policy state;
* terms snapshot / current-term revalidation state;
* role-scoped account verification where explicit and consented;
* aggregate completion/issue history only if sample-safe and privacy-safe.

### Forbidden data sources

Do not use:

* external consumer-credit scores or Sesame-like financial credit;
* income, job, education, home ownership, debt, loan, spending, repayment, or purchasing-power data;
* social graph, contacts, friends, followers, private communities, inferred affiliations, or demographic traits;
* private browsing/search/planner/feed-feedback state except as the user's own private readiness view;
* engagement metrics, popularity, view counts, save counts, chat responsiveness, or content performance as trust;
* hidden model features that cannot be explained and challenged.

### Trust Snapshot UX/UI

| Surface | Exact UX/UI | CTA | Omit / degrade when |
|---|---|---|---|
| **Browse card** | Optional one small chip after source/state or in chip area: **Role verified**, **History limited**, **Issue pending**, or **Trust info**. It must not appear above the card or replace the receipt atom. | Chip opens detail Explain row or disclosure; item CTA unchanged. | Omit if it would exceed two chips, crowd the CTA, or require a score. |
| **Detail** | One collapsed **Explain** row below first screen: **Trust snapshot**. Opening shows role, facts used, facts missing, last checked, limits, and whether it affects the current action. | **View trust details**, **Back**, **Report trust issue** only if support backed. | Use **Trust data unavailable** or omit if no source owner exists. |
| **Action sheet** | Show trust only if directly decision-critical, as one row below condition/release: e.g. **Reviewer credential current** or **Credential stale · Review current terms**. | Sheet CTA remains receipt CTA or downgraded blocker CTA. | Do not show decorative trust badges in sheet. |
| **Plan / Track row** | Row may show trust issue only if it affects that row: **Issue pending**, **Credential stale**, **Support review needed**. | Row adapter CTA: **Review current terms**, **Fix requirements**, **Contact support**, or ordinary row CTA. | Do not duplicate Account/Profile trust state. |
| **Account/Profile** | Private row **Your role readiness**: identity/auth state, creator/reviewer requirements, credential expiry, unresolved support blockers, review readiness, and one next action. | **Fix requirements**, **View settings**, **Submit for review**, **Back to offers** where backed. | No public score, rank, perks, progress gamification, or follower/status benefits. |
| **Support** | Trust challenge uses fixed reason chips and private note, then backed support row or SafeState. | **Submit issue** only if support backed. | No public complaint, rating, automatic reclassification, or public penalty. |

### Trust details sheet / inline row order

When the user opens **Trust snapshot** or **View trust details**, render:

1. title: **Trust snapshot**;
2. role: creator / reviewer / verifier / recipient / support / platform / user-owned role;
3. current label: **Role verified**, **Credential current**, **History limited**, **Issue pending**, etc.;
4. facts used, max five rows;
5. facts missing / unknowns;
6. last checked / source freshness if real;
7. whether this affects current eligibility, CTA, guide inclusion, or only context;
8. limitation row: **This is not a guarantee and not a moral score.**;
9. optional private **Report trust issue** row;
10. **Back**.

### Trust computation rule

If a repository already has a stricter trust/readiness adapter, use it. Otherwise, Trust Snapshot is computed only by deterministic, explainable rules over backed rows:

* **Role verified** only if the role's credential or authorization is current.
* **Credential current** only if a dated credential is valid and scoped to this role.
* **History available** only if there is privacy-safe, sample-safe, role-relevant history.
* **History limited** or **Not enough history** is the default for new or sparse records; it is not a negative label.
* **Issue pending** only if an authoritative support/Track row says an unresolved issue affects this role/object.
* **Credential stale** only if a prior credential exists and is expired/stale.
* **Trust data unavailable** if source owners are absent, conflicting, or not connected.

Do not train, infer, or expose a black-box score for Release A. Do not make Trust Snapshot a ranking feature. If later releases use model-assisted trust, the UI must show factors, recency, source owners, missing data, challenge path, and no hidden rank effect.


## v75 Cross-Perspective Context Notes

This is the only added v75 pattern.

### Purpose

A Cross-Perspective Context Note helps users with different moral views understand the same factual or procedural context before they act. It is a compact note about a specific claim, assumption, guide rule, estimate, evidence example, trust label, or terms-change explanation. It is not a public comment, platform verdict, moral judgment, popularity signal, or ranking input.

### Allowed note targets

A Context Note may attach only to a specific, user-visible object or claim:

* a card/detail claim such as exposure, preview/live state, evidence burden, verification route, or no-charge/release rule;
* a guide inclusion/exclusion rule or **Why this guide?** explanation;
* a DealScout comparison answer or unknown-field caveat;
* a Trust Snapshot label or role-readiness caveat;
* a reference estimate, mechanism explanation, redacted evidence example, or terms-change row;
* a support/review resolution where a context correction is required.

### Allowed source owners

Use only source owners that already exist or can be safely documented by the repository:

* `MarketplaceDisplayModel`, terms snapshot, current-term revalidation, or route-state adapters;
* reviewer/admin/system policy notes;
* public source documents, standards, or versioned rule pages that are already in the repository or trusted source records;
* support/review rows and issue-resolution records;
* guide-rule evaluation fields and missing-field lists;
* bridge-review ratings only if the repository has a backed, privacy-safe process for contributor/reviewer ratings across meaningfully different perspectives.

### Forbidden sources

Do not use:

* likes, reposts, replies, quote posts, impressions, trending topics, follower count, view count, or engagement metrics;
* public comments, anonymous allegations, unsourced claims, or social-media fights;
* external consumer-credit, demographics, social graph, exact location, private affiliations, or inferred communities;
* private browsing/search/planner/feed-feedback data except as the user's own private context;
* hidden model features that cannot be explained and challenged.

### Bridge-review rule

A note may say **Bridge-reviewed context** only if all of the following are true:

1. the note text is source-backed and bounded to one claim;
2. contributor/reviewer groups are privacy-safe and role/perspective-distinct enough for the current domain;
3. the note is rated helpful by contributors/reviewers from those different perspectives, not merely by a simple majority or one group;
4. the process is recorded by an authoritative source owner;
5. rater identities and small-group counts are not exposed.

If these conditions are not met, the note may be **Source-backed context**, **Needs review**, **Context unavailable**, or omitted. Do not claim bridge review from ordinary likes, staff approval, or one-sided agreement.

### Context Note UX/UI

| Surface | Exact UX/UI | CTA | Omit / degrade when |
|---|---|---|---|
| **Browse card** | Optional one small chip in the two-chip budget: **Context note** or **Source-backed context**. It must sit after source/state/exposure facts and never above the first card. | Chip opens detail Explain row; item CTA unchanged. | Omit if it would exceed two chips, crowd the receipt atom, or require a comment thread. |
| **Detail** | One collapsed **Explain** row below first screen: **Context note** or combined **Context & trust** if both are backed. | **View context**, **Back**, **Report context issue** only if support backed. | Use **Context unavailable** or omit if no source owner exists. |
| **Action sheet** | Context appears only if decision-critical, as one row below condition/release: e.g. **Context note · Review assumptions**. | Sheet CTA remains receipt CTA or downgraded blocker CTA after authoritative revalidation. | Do not show decorative context badges in sheet. |
| **Guide / DealScout** | Note appears inside guide/disclosure/DealScout explanation as a source/caveat row, not as a ranked comment. | **View context** or **Back**. Item CTAs remain item receipt CTAs. | Omit if it would look like social proof or authority. |
| **Plan / Track row** | Row may show context only if it affects that row: **Context note · Terms changed**, **Outdated context**, or **Needs review**. | Row adapter CTA remains owner CTA. | Do not duplicate Account/Profile context state. |
| **Account/Profile** | No public context-note profile. Account may link to user-submitted support/review issues only if backed. | **View case** or **Back** where backed. | No contributor score, note leaderboard, context reputation, or public participation badge. |
| **Support** | Context challenge uses fixed reason chips and private note, then backed support/review row or SafeState. | **Submit issue** only if support backed. | No public correction fight, automatic reclassification, or public penalty. |

### Context details sheet / inline row order

When the user opens **Context note** or **View context**, render:

1. title: **Context note**;
2. affected claim/surface;
3. short note text, two to four lines where possible;
4. sources/facts used, max five rows;
5. facts missing / unknowns;
6. bridge status: **Bridge-reviewed context**, **Source-backed context**, **Needs review**, or **No bridge review**;
7. last checked / source freshness if real;
8. whether this affects receipt facts, eligibility, guide inclusion, trust label, or only context;
9. limitation row: **This is context, not a verdict.**;
10. optional private **Report context issue** row;
11. **Back**.

### Context challenge path

Inside Context details, **Report context issue** uses fixed reason chips:

* **Context seems wrong**
* **Source outdated**
* **Missing important context**
* **Not relevant to this trade**
* **Privacy concern**
* **Other**

The optional note is private/support-scoped. Submission creates a support/review row only if backed; otherwise it shows **Support intake is not connected yet** or **Context unavailable**. It never creates a public complaint, public correction count, comment thread, ranking change, public accusation, or direct counterparty chat.

### Context computation rule

If a repository already has a stricter context-note, reviewer-note, or policy-note adapter, use it. Otherwise, Context Notes are deterministic display rows over backed source owners:

* **Source-backed context** only if a source owner, source text/record, and affected claim are known.
* **Bridge-reviewed context** only if the bridge-review rule above passes.
* **Needs review** only if a note exists but is not yet visible/accepted.
* **Outdated context** only if a dated note has been superseded by current terms/rules/source state.
* **Context unavailable** if source owners are absent, conflicting, or not connected.

A Context Note cannot itself change the receipt atom. If the note reveals a stale term or wrong field, the authoritative adapter must update or downgrade the receipt atom before CTA behavior changes.


## v75 exact active route UX/UI

### 1. Browse current-state UX/UI

At 390px width, `/` and `/offers` render one compact marketplace shelf:

1. sticky search bar: **Search causes, templates, rounds**;
2. one tab row;
3. one context/status line;
4. one combined horizontal control rail;
5. first receipt-bearing card or lane empty SafeState;
6. optional auxiliary below first card, default **none**;
7. bottom nav.

If live count is verified zero, the exact first screen is:

1. search;
2. tabs **Templates / Examples / Public goods / Guides**;
3. context **No live offers yet · Showing examples and templates**;
4. combined rail with the highest-value category/filter chips;
5. first **Template** or **Example** card.

First object receipt:

* identity: template/example title;
* state: **Template** or **Example**;
* exposure: **Preview only** or **No commitment**;
* condition/protection: **No commitment**;
* CTA: **View details**, **Create similar**, or **Create from template**.

When live offers are verified, the same shelf may use **Live / Preview / Templates / Examples / Guides**, with **For you** only when real user-scoped signals exist. Live/personalized variants are parked until backed.

Forbidden above the first object: **For you** without real signals, live-looking example cards, fake live count, separate guide row, DealScout row, Trust Snapshot row, Context Note row, second control rail, account/cart/message/Profile widgets, hero banners, or methodology text.

### 2. Public deal-card UX/UI

Each public card is one scan unit:

1. semantic visual tile, 88-112px on row cards;
2. title, maximum two lines;
3. state badge + source label;
4. exposure/metric line: **Max $X**, **No charge now**, **Preview only**, **Template**, **Example**, **Unavailable**, or **Exposure unknown**;
5. one condition/protection line;
6. at most two chips, including at most one trust or context chip if backed;
7. one CTA pill.

Card body opens detail. Card CTA opens detail, preview sheet, create-from-template, auth, or SafeState. Card CTA does not create a live commitment, payment, support case, public demand, message, evidence state, planner row, or trust challenge.

### 3. Detail UX/UI

At 390px width, detail renders:

1. top controls: back, optional search, optional save only if backed;
2. decision block: visual/source/status → title → two-line summary;
3. receipt economics band: state, exposure, condition/protection;
4. one true trust strip, max one row;
5. option chips only if real, max two rows;
6. sticky footer: compact receipt atom + one CTA;
7. one collapsed **Explain** row below first screen, usually **Requirements & rules**, **Why shown?**, or **Trust snapshot** / **Context note**, or none.

Card, economics band, footer, and sheet footer must express the same receipt facts unless the handoff intentionally downgrades. A stronger CTA requires backed current-term revalidation and a visible reason. Trust Snapshot or Context Note cannot justify a stronger CTA by itself.

### 4. Action-sheet UX/UI

At 390px width, a sheet renders:

1. handle/close;
2. object title/source/status;
3. exposure or **No charge now**;
4. condition/review/release row;
5. optional blocker, max one visible blocker;
6. footer receipt atom + one CTA.

| Sheet state | Exact UX/UI | CTA | Result |
|---|---|---|---|
| **Preview** | title/source/status → exposure/no-charge → **No commitment will be created** → condition/release → footer | **Preview budget**, **Create similar**, or **Create from template** | sheet result or toast **No commitment was created.** |
| **Commit** | title/source/status → max exposure → activation/charge/review condition → payment/no-payment where backed → release/refund/no-charge rule → one blocker if any → footer | **Authorize pledge** or **Commit conditionally** only after backing and current revalidation pass | owner-row link **Commitment created.** only after mutation and authoritative Track row |
| **Blocked** | title/source/status → blocker reason → unchanged-state line → one recovery path → footer | **Fix requirements**, **Review current terms**, **Sign in to continue**, **Set up later**, or **Back to offers** | **No durable state changed.** |

No payment UI in Preview. No stacked sheets. No success/confetti/order card unless a real durable row exists. Trust Snapshot or Context Note appears only if directly decision-critical and backed.

### 5. Plan UX/UI

At 390px width:

1. owner strip **Plan — private selected items. No commitment created.**;
2. one compact tabs/filter row only if backed;
3. first authoritative planner row or SafeState;
4. row CTA;
5. mini tray only if real selected rows exist.

Planner row: row-kind badge → title max two lines → receipt line → latest real planning step → one CTA → overflow. Mini tray may show selected count and max exposure only if derivable. It is not checkout. Trust/context labels appear only when they explain a row-specific blocker, role state, or terms/source caveat.

### 6. Track UX/UI

At 390px width:

1. owner strip **Track — commitments, drafts, and issues.**;
2. one compact tabs row only if backed;
3. first authoritative row or SafeState;
4. row CTA;
5. no duplicate message/account shortcut state.

Track row: row-kind badge → title max two lines → receipt line → latest real step → one CTA → overflow. No fake commitments, pending holds, reviewer queues, ETA, support cases, duplicate Account/Messages/Profile state, or trust-score row, context-note thread, or public note status.

### 7. Account / Profile UX/UI

At 390px width:

1. account/auth header;
2. owner strip **Account — saved settings and records.**;
3. Support/Settings shortcuts only if route-safe;
4. compact shortcut grid only for backed route owners;
5. first authoritative row summary, private **Your role readiness** row, backed support/context issue link, or SafeState;
6. preferences below.

Shortcut tiles show label + destination. They do not own counts, status, exposure, CTA, ranks, coins, balances, perks, followers, popularity, or row progress. **Your role readiness** is private and categorical, never public credit.

### 8. Create UX/UI

Bottom-nav **Create** opens one sheet before any form.

Rows:

1. **Create offer draft** — badge **Draft** or **Unavailable**; CTA **Save draft** or SafeState;
2. **Create from template** — badge **Template**; CTA **Create from template** or **View templates**;
3. **Preview public-goods round** — badge **Preview**; CTA **Preview budget** or SafeState;
4. **Request review** — badge **Reviewing** or **Unavailable**; CTA **Submit for review** or SafeState.

Each row has badge, title, one-line outcome, and one CTA/SafeState. No raw form first. No publish/live CTA without backing and current revalidation. Creator/reviewer readiness may be shown only inside the selected create path or private Account readiness row.

### 9. Auxiliary UX/UI

Default is **none**.

| Auxiliary | Specific UX/UI | CTA | Omit when |
|---|---|---|---|
| **Guide** | One **Guides** tab or below-card chip. Guide detail: **Guides use rules, not popularity** → source chips → receipt-card list → **Why this guide?** | **View guide**; item CTA remains item receipt CTA. | Rule cannot be computed/disclosed, or guide would appear above the first object. |
| **Explain** | One collapsed row below object: **Requirements & rules**, **Why shown?**, **Verification & funding**, **Trust snapshot**, **Context note**, or stricter equivalent. | **View requirements**, **View rules**, **View trust details**, **View context**, **Back**, **View rule details**. | It repeats receipt lines, needs a second CTA, or crowds first object. |
| **Support** | Fixed reason chips → optional private note → visibility row → backed support row or SafeState. | **Contact support** / **Submit issue** only when backed. | Support path is not backed or would imply public complaint/rating/chat/fake progress. |

DealScout, if present, is **Explain** by default and must use visible/backed display models only. It cannot negotiate, discover contacts, auto-select, auto-commit, create hidden outreach, or use Trust Snapshot or Context Notes as hidden ranking input.

### 10. Direct-route SafeState UX/UI

Unsupported route, stale ID, auth gate, not-connected feature, missing object, unavailable item, or unavailable trust details renders:

1. short title;
2. one-sentence reason;
3. optional receipt fragment: **Preview only · No commitment**, **Unavailable · Terms changed**, **Not connected yet**, **Sign in required**, **Trust data unavailable**, or **Context unavailable**;
4. one recovery CTA;
5. one optional secondary link.

No raw provider errors, Supabase errors, Stripe errors, stack traces, feature flags, queue IDs, internal enums, raw forms, partial dashboards, credit-score pages, community-note/comment pages, suspense-only shells, or competing CTAs.

## v75 bottom navigation

Default 390px bottom nav:

1. **Browse** — `/offers` or `/`.
2. **Plan** — planner/cart only if backed/local/route-safe; otherwise omit or replace with **Guides** only if guide route is useful and backed.
3. **Create** — opens Create Entry Sheet.
4. **Track** — commitments/pledges and lifecycle rows.
5. **Account** — Profile/My.

Messages lives under Track or Account unless a real lifecycle inbox is more useful than Plan/Guides and route-safe. Matches/DealScout lives under Browse or Plan, not bottom nav by default. Trust Snapshot and Context Notes do not get bottom-nav targets. Payment, receipts, evidence, admin, token, relay, queue, refund, support, and notification pages do not become bottom-nav targets in Release A solely because older specs named them.

## v75 deletion rules

When a route is verbose or conflicted, delete/demote in this order:

1. old hero/methodology/theory blocks;
2. second banner, promotion-like strip, decorative notice, large illustration;
3. quick-action strip, spotlight lane, duplicate guide row, DealScout row, Trust Snapshot row above the object, Context Note row above the object;
4. account/cart/message/Profile widget on public Browse;
5. duplicate status, terms, role, mechanism, funding, eligibility, evidence, privacy, support, trust, or context card;
6. second auxiliary class;
7. secondary CTA;
8. chips beyond two visible chips;
9. long mechanism prose, calculations, FAQ, rule text, caveats;
10. decorative or unbacked media;
11. only then tighten spacing within accessibility and touch-target limits.

Never delete or hide source state, status, maximum exposure, obligation, charge/release/no-charge rule, eligibility blocker, privacy/visibility fact where decision-critical, row kind, or primary CTA. Do not keep a trust or context chip if it forces these required facts out of view.

## v75 proof requirement

Use one six-row rendered evidence table unless the repository already has a stricter convention.

| Proof row | Required proof fields |
|---|---|
| **Browse** | verified current scenario, first-render result, first object receipt atom and source owners, first 390px shelf order, combined rail behavior, first card/empty SafeState, auxiliary, trust/context chip if any, omitted modules, bottom nav, evidence, pass/fail |
| **Detail/Sheet** | object key/source owner, same receipt facts on card/detail/footer/sheet, CTA handoff state, sheet scenario, revalidation/checking copy, result placement/copy, owner row or non-durable result, auxiliary/trust snapshot/context note if any, evidence, pass/fail |
| **Plan** | planner backing/local owner or SafeState, first row receipt atom, selected count/exposure derivation, mini tray behavior, trust/context row if row-specific and backed, no checkout/live state from private selection, evidence, pass/fail |
| **Track** | authoritative row owner, first row/SafeState receipt atom, lifecycle state source, invalid-row treatment, row CTA, trust/context issue if any, no duplicate Account/Messages/Profile state, evidence, pass/fail |
| **Account/Create** | Account shortcut ownership, private role-readiness row if any, Create Entry Sheet option receipts, draft/template/review successor row or SafeState, no raw form first, no fake shortcut counts or credit score, evidence, pass/fail |
| **Direct-route safety** | first-render result, SafeState title/reason/recovery CTA, auth return if relevant, unavailable trust/context details if relevant, no raw errors, no partial route shells, no fake support/durable state, evidence, pass/fail |

Completion cannot be claimed from type definitions, component exports, matching screenshots, or prose. Completion requires route evidence: rendered-route checks, DOM checks, screenshots with state/selector context, page-object actions, Storybook interactions, tests, or a documented stricter equivalent.

## v75 non-negotiable constraints

* Treat this v75 file as the only active implementation target.
* Do not use v1-v74 as an active backlog or appendix.
* Do not create new runtime architecture, proof architecture, acceptance-gate files, receipt-framework files, credit-score engines, community-note/comment systems, social-ranking systems, or historical-version appendices solely to satisfy v75.
* Do not implement optional or hypothetical variants before current-state gates pass.
* Do not render route-specific UI before the first-render decision resolves receipt object, empty lane, auth SafeState, not-connected SafeState, unavailable SafeState, safe redirect, or trust unavailable state, or context unavailable state.
* Do not let Browse show more than search, one tab row, one context line, one combined rail, and the first card/empty state before bottom nav at 390px.
* Do not let non-Browse routes show guide, DealScout, disclosure, support, funding, eligibility, trust, context, account widgets, cart widgets, message widgets, or mechanism facts above the receipt-bearing object.
* Do not allow auxiliary content above the first object; default to none.
* Do not render a public card, detail, sheet, private row, result, Trust Snapshot, Context Note, or SafeState without adjacent visible receipt facts or a clear SafeState reason.
* Do not allow receipt-like summaries on the same first screen to disagree.
* Do not let card → detail → sheet CTA strengthen without backed revalidation and visible reason.
* Do not show a live/review/support/order/payment CTA unless the receipt, selected release, backend mutation, row owner, and current revalidation all allow it.
* Do not show a successor row link unless the row exists and derives from the same object key or declared successor key.
* Do not use generic **Success**, **Joined**, **Order placed**, **Reserved**, **Claimed**, **Hot**, **Best**, **Popular**, **People like you**, numeric credit scores, **信用极好**, **green pass**, moral-score copy, **community agrees**, **viral**, **trending**, likes/reposts/replies counts, public comment, or contributor-rank copy.
* Do not make zero-live mode look live.
* Do not duplicate private row state across Plan, Track, Account, Messages, Profile, Trust Snapshot, Context Note, and toast/result surfaces.
* Do not use Trust Snapshot or Cross-Perspective Context Notes to silently influence feed/search/guide/DealScout rank, hide eligibility blockers, bypass review, accept evidence, alter CTAs, or create moral authority.
* Do not use external credit, consumer-finance, demographics, social graph, exact location, private history, engagement, popularity, replies, reposts, likes, quote posts, or trend data as trust or context-note data.
* Do not solve first-screen density by hiding source/status/exposure/obligation/payment/evidence/privacy/eligibility/CTA facts, using color-only state, relying on hover/tooltips, shrinking text below accessibility limits, or replacing concrete facts with a trust/context badge.
* Do not claim v75 completion without six rendered evidence proof rows or a stricter existing route-evidence convention.

* Do not add X/Twitter-style public comments, replies, quote posts, reposts, likes, follower counts, trending topics, community pile-ons, public note fights, contributor leaderboards, or engagement-maximizing For You ranking to satisfy v75.
* Do not label a Context Note as **Bridge-reviewed** unless a backed bridge-review process exists and the note is source-backed, claim-scoped, privacy-safe, and helpful across different perspectives.
* Do not let a Context Note override the receipt atom. The authoritative adapter must update state, exposure, condition, eligibility, or CTA before the UI changes action behavior.

## v75 end marker

This is the complete active spec. There are intentionally no historical appendices.
