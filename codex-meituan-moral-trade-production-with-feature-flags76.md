# Codex GPT-5.5 Extra High task: implement a production-grade Meituan / Taobao / Dianping / Xianyu / X-inspired Moral Trade marketplace — v76 active implementation spec

> v76 is an **active-only unified-explain-slot and desktop-mirror pass** on top of v75. It does **not** add another feature family, backend system, social layer, reputation layer, ranking system, proof framework, receipt framework, acceptance-gate object, or runtime architecture. It improves v75 by consolidating Role-Scoped Trust Snapshot and Cross-Perspective Context Notes into one subordinate **Explain Slot** so they cannot become parallel surface systems, and by adding a concrete **Web/Desktop Mirror Contract** so desktop implementation follows the same object-first marketplace rhythm as mobile instead of becoming a document/dashboard layout. Use this file alone as the active instruction. Do not reconstruct or consult v1-v75 unless a human explicitly asks for historical context.

## v76 improvement summary: what changed and why

v75 is directionally correct: it keeps architecture frozen, implements current state first, protects the compact Browse shelf, keeps receipt facts adjacent, adds Xianyu-inspired trust only as a role-scoped snapshot, and adds X/Twitter-inspired context only as claim-scoped, source-backed context. It can still be improved in two ways.

1. **Auxiliary sprawl risk.** v75 names Trust Snapshot and Cross-Perspective Context Notes separately. Even though both are constrained, Codex could still render two chips, two rows, two drawers, or two support flows around the same object. v76 collapses them into one **Unified Explain Slot**. Trust, context, guide rules, requirements, funding, verification, and support caveats become sections inside one subordinate explanation surface, not separate route/surface systems.
2. **Desktop ambiguity.** v75 is explicit at 390px but less explicit for web/desktop. Codex could make desktop document-heavy or dashboard-like while technically preserving the mobile contract. v76 adds a **Web/Desktop Mirror Contract**: larger screens may add columns, rails, and side panels, but they must mirror the same receipt atom, CTA owner, current-state patch loop, and object-first semantics.

Credence that v76 improves v75 for Codex implementation quality: **0.57**. The main benefit is lower path-dependency risk from multiple explanation patterns and clearer desktop execution. The main risk is adding more specification text; v76 mitigates that by deleting conceptual freedom rather than adding product scope.

## v76 design changes

| v76 design | Purpose / improvement | Specific UX/UI Codex should build or verify | Primary CTA rule | Omit / simplify when |
|---|---|---|---|---|
| **Unified Explain Slot** | Prevents Trust Snapshot, Context Note, Why shown, requirements, rules, funding, verification, and support caveats from becoming separate above-fold systems. | Each screen may expose at most one subordinate explain entry below the receipt-bearing object. The entry label is chosen from backed content: **Requirements & rules**, **Why shown?**, **Trust & context**, **Verification & funding**, or **Support details**. Opening it shows sections in one sheet/inline panel. | Explain Slot never owns the item CTA. It exposes only secondary actions such as **View details**, **View context**, **View trust details**, **Report issue**, **Back**, or **Contact support** where backed. | Omit if it repeats receipt lines, needs a second primary CTA, crowds the first object, or has no source owner. |
| **One card explain chip** | v75 permits trust/context chips; v76 prevents chip clutter. | A public card may show at most one explain chip inside the existing two-chip budget. Priority: hard blocker/current terms > sponsored/policy/placement > trust issue > context note > guide rule > generic **Why shown?**. | Chip opens the Unified Explain Slot. Card CTA remains unchanged. | If the card already needs two truth-bearing chips, move explain to detail or overflow. |
| **Trust + context as sections, not surfaces** | Keeps Xianyu/X-style inspirations useful but subordinate. | Inside the Unified Explain Slot, show **Trust snapshot** and/or **Context note** sections only when backed. They share source rows, limitations, last checked, and private challenge handling. | Section CTAs are secondary. They cannot strengthen item action, rank, eligibility, or evidence acceptance. | Omit if support/review/source backing is missing, or if showing the section would imply public credit, social proof, moral authority, or comments. |
| **Effect scope row** | Makes every explanation say what it can and cannot change. | Every Trust/Context/Guide/Explain section includes one row: **Effect on this action:** **None**, **Explains why shown**, **Explains blocker**, **Requires adapter recheck**, or **Support-only**. | CTA changes only when the authoritative adapter/revalidation changes the receipt atom. | If effect scope cannot be stated, omit the section or show SafeState. |
| **Web/Desktop Mirror Contract** | Makes desktop more Taobao/Dianping-like without creating a second product. | At 1280px+, use a desktop marketplace shell: fixed left task nav, central Browse/list column, optional right filter/explain rail, detail/work panel, and review-plan side panel when active. The same receipt atom and CTA owner appear as on mobile. | Desktop CTAs are the same source-owned CTAs as mobile. Desktop cannot add a stronger action. | Do not add desktop-only dashboards, document essays, extra CTAs, fake widgets, or secondary state owners. |
| **Desktop Browse rail discipline** | Uses desktop space for filters without pushing inventory down. | Browse desktop order: left nav → top search → tabs → safety/context strip → combined filter rail/row → first receipt card → secondary card grid. Quick filters may appear as a right rail only if the first card remains visible. | Browse shell has no commit CTA. First card/item owns action. | Remove banners, duplicate guide rows, DealScout rows, and account/message widgets before increasing vertical height. |
| **Desktop Detail + Review Panel** | Makes web deal detail feel like a Taobao detail page plus plan sheet, not a document. | Detail desktop: breadcrumbs/top controls → paired visual tiles → title/cause chips → trust/status chips → action row → overview/key details → recipient/evidence card. Right side: **Review your plan** panel with amount, what happens, price/exposure, methods, and one confirm CTA. | Detail CTA and review-panel CTA may match or downgrade; review-panel CTA cannot strengthen without backed revalidation. | If review/commit/payment is not backed, render preview/no-charge state or SafeState; do not show fake checkout. |
| **Private rows stay rows on desktop** | Prevents Account/Messages/Planner desktop from becoming dashboards. | Planner, Track, Messages, Account use owner strip + row list. Wider screens may show split list/detail only after a real row is selected. Shortcuts are labels + destinations. | Owner row adapter owns row CTA. | If no owner row exists, show SafeState or omit shortcut. No fake counts or profile stats. |
| **Design-system strip as demo only** | Clarifies that visual asset/badge strips are documentation, not production state. | A Visual Asset System strip may appear in Storybook/design/docs or a non-production design page. Production Browse must not render the strip as inventory. | No production CTA. | Omit from production routes unless explicitly in a design-system/demo context. |
| **Evidence before optional polish** | Preserves v75's implementation discipline while adding desktop evidence. | Required proof includes rendered mobile and desktop evidence for changed UI where practical: 390px and one desktop target, usually 1280px or 1600px. | No user CTA. | Do not claim v76 completion from file edits, component exports, or a single screenshot without state/DOM context. |

## v76 canonical architecture rule

Codex must treat v76 as the only active Release A implementation shape.

1. **Use v76 alone.** Do not use v1-v75 as an active backlog, appendix, or feature catalogue.
2. **Freeze architecture.** The active work is route implementation and rendered evidence, not new framework files or new specification layers.
3. **Use existing code paths where possible.** Prefer existing display adapters, route components, constants, tests, page objects, Storybook stories, DOM checks, support rows, credential rows, source/context rows, reviewer notes, and final-report tables.
4. **Implement current state first.** Verified zero-live inventory gets zero-live Browse. Missing backing gets SafeState or omission. Unsupported variants are parked.
5. **Patch the earliest failing rendered route.** Do not touch optional variants while an earlier route in the patch loop fails.
6. **Browse has one compact shelf.** Search, one tab row, one context line, one combined rail, then first card/empty lane. No second rail or auxiliary above inventory.
7. **Non-Browse routes show the object first.** Only top controls may precede the receipt-bearing object.
8. **Receipt atom stays adjacent and source-owned.** Identity, state, exposure, condition/protection, CTA, result, and owner row come from authoritative source owners or intentionally degrade.
9. **Use exactly one Unified Explain Slot.** Trust Snapshot, Context Note, guide rule, requirements, verification, funding, mechanism facts, and support caveats are sections inside this slot when backed. They do not become independent above-fold rows or route families.
10. **Auxiliary defaults to none.** If present, choose one: **Guide**, **Explain**, or **Support**, below the object. In most cases Trust and Context are sections inside **Explain**.
11. **CTA handoff may match or downgrade.** Card → detail → sheet/review panel can strengthen only after visible backed revalidation.
12. **Durable results sync to one owner row.** Plan, Track, Create, or Support owns durable rows. Account and Messages link unless backed as stricter row owners.
13. **Trust labels and context notes do not silently rank or decide.** They may explain eligibility/readiness/caveats; they cannot silently influence feed/search/guide/DealScout rank, evidence acceptance, CTA strength, or moral authority.
14. **Desktop mirrors mobile semantics.** Wider viewports may add rails, columns, sticky side panels, or split panes only if they preserve the same source-owned receipt atom and CTA owner.
15. **Completion requires evidence.** A route is not complete without rendered route evidence or a stricter existing equivalent.

## v76 current-state patch loop

Implement and verify in this order.

| Step | Route / flow | Exact target | Stop condition |
|---|---|---|---|
| 1 | **Browse current state** | At 390px, show search, one tab row, one context line, one combined rail, first Template/Example card or empty lane, and bottom nav. At desktop, show left nav, search/tabs/strip/filters, first card, optional filter rail, and no above-object auxiliary. | Stop if the first card/empty lane is not visible and understandable before optional modules. |
| 2 | **First card → detail → sheet/review panel/SafeState** | Card opens detail. Detail shows economics receipt atom and footer/action row. Footer opens preview sheet, review-plan panel, or SafeState. Result copy is non-durable unless a real owner row exists. Unified Explain Slot, if present, is below the object. | Stop if card/detail/sheet/review-panel receipt facts disagree, CTA strengthens without backed revalidation, trust/context contradicts source state, or desktop creates extra CTAs. |
| 3 | **Direct-route safety** | `/offers/new?mode=offset`, stale detail, `/matches`, `/messages`, `/cart`, `/pledges`, and equivalent direct routes render receipt object, empty lane, SafeState, or safe redirect with no raw shell. | Stop if raw provider errors, partial forms, partial dashboards, credit-score pages, comment/note pages, or suspense-only shells appear. |
| 4 | **Plan / Track current state** | Plan and Track show owner strip, one compact tabs/filter row if backed, first row or SafeState, one row CTA. Desktop may use split view only for real selected rows. | Stop if private rows are duplicated across Plan/Track/Account/Messages or imply checkout/live state. |
| 5 | **Account / Create current state** | Account shows settings/links and may show private **Your role readiness** only if backed. Create opens option-receipt sheet before any form. | Stop if Account shows fake counts, credit score, perks, trust ranks, context reputation, or Create routes to raw form first. |
| 6 | **Backed optional variants only** | Guide, Explain, Support, personalized, live, review, payment, receipts, DealScout, Trust Snapshot, and Context Note variants only if source owners and rendered gates already pass. | Stop if any optional variant crowds first object, creates unbacked state, or introduces hidden score/ranking/comment behavior. |

## v76 first-render decision

Every route first resolves one of these states before route-specific copy appears.

| Gate result | Exact UX/UI | CTA rule |
|---|---|---|
| **Receipt object** | Final slot order with adjacent receipt atom. Loading skeletons preserve final slots without route-specific claims. | Receipt CTA only. |
| **Empty receipt lane** | First object slot: title, one reason, optional receipt fragment, one recovery CTA. | **View templates**, **Browse offers**, **Change filters**, **Back to offers** where backed. |
| **Auth SafeState** | **Sign in required**, what remains unchanged, one CTA. After auth, revalidate and require a new tap. | **Sign in to continue**. |
| **Not-connected SafeState** | **Not connected yet**, one reason, one recovery CTA. | **Set up later**, **Back to offers**, or **Contact support** only if backed. |
| **Unavailable SafeState** | **Unavailable** or **Terms changed**, optional object fragment, one recovery CTA. | **Review current terms**, **Find similar**, **Remove**, **Back to offers**, or **Contact support** where backed. |
| **Safe redirect** | Redirect/link to generic `/offers`. | **Browse offers**. |
| **Explain unavailable** | If trust/context/rule details were requested but source owners are absent, show **Details unavailable** inside Explain or omit entirely. | **Back** or **Contact support** only if backed. |

## v76 controlled copy ledger

Use this ledger unless the repository already has stricter equivalent copy.

| Receipt / explain line | Allowed copy | Degrade to | Forbidden copy |
|---|---|---|---|
| **State** | **Live**, **Preview**, **Template**, **Example**, **Unavailable**, **Draft**, **Reviewing**, **Action needed**, **Done**, **Issue**, **Safe** | **Preview**, **Unavailable**, **Safe** | raw enums, feature flags, **Hot**, **Best**, **Popular**, **Deal**, **Claimed**, **Ready**, **All set** |
| **Exposure** | **Max $X**, **No charge now**, **Preview only**, **Exposure unknown**, **Not connected**, **Unavailable** | **Exposure unknown**, **Not connected**, **Unavailable** | hidden exposure, tooltip-only exposure, fake discount/savings/cheap/free copy |
| **Condition** | **Review required**, **No commitment**, **Terms changed**, **Sign in required**, **Eligibility unknown**, **Not connected**, **No durable state changed** | **Review current terms**, **Eligibility unknown**, **Not connected** | **success**, **joined**, **reserved**, **matched**, **order placed**, **approved**, **guaranteed** without exact backed state |
| **Protection/privacy** | **No commitment will be created**, **Private planning only**, **Lifecycle updates only**, **No counterparty chat**, **Authorization released if not cleared**, **Support intake not connected yet** | **Private planning only**, **Not connected** | fake refund guarantee, fake privacy guarantee, public proof, direct counterparty chat, hidden obligations |
| **Primary CTA** | **View details**, **Preview budget**, **Create similar**, **Create from template**, **Sign in to continue**, **Save draft**, **Submit for review**, **Authorize pledge**, **Commit conditionally**, **Review current terms**, **Fix requirements**, **View guide**, **Back to offers**, **Browse offers**, **Set up later**, **Contact support** | **View details**, **Review current terms**, **Back to offers**, **Browse offers** | **Buy**, **Join**, **Checkout**, **Claim**, **Grab**, **Hot deal**, **People like you**, **Best moral trade** |
| **Result** | **No durable state changed.**, **No commitment was created.**, **Added to planner. No commitment created.**, **Draft saved. No commitment created.**, **Submitted for review. No live commitment created.**, **Signed in. Review current terms before continuing.**, **Commitment created.** only after real mutation and authoritative row | **Could not confirm. Review current state.**, **No durable state changed.** | generic **Success**, fake order row, fake receipt, fake support code, fake queue, fake ETA |
| **Trust Snapshot** | **Role verified**, **Credential current**, **History available**, **History limited**, **Not enough history**, **Issue pending**, **Credential stale**, **Trust data unavailable**, **Support review needed** | **History limited**, **Trust data unavailable**, **Not connected** | numeric score, **信用极好**, **信用优秀**, **low credit**, **green pass**, **trusted user**, **best user**, **reliable person**, **bad actor**, **people like you**, rank boost, moral score |
| **Context Note** | **Context note**, **Source-backed context**, **Bridge-reviewed context**, **Needs review**, **Outdated context**, **Context unavailable**, **Not a verdict** | **Context unavailable**, **Needs review**, omit note | **fact checked** unless formal process exists, **true**, **false**, **debunked**, **community agrees**, **viral**, **trending**, **ratioed**, likes/reposts/replies/comments counts, contributor rank, moral verdict, hidden rank boost |
| **Unified Explain Slot** | **Requirements & rules**, **Why shown?**, **Trust & context**, **Verification & funding**, **Support details**, **Details unavailable** | **Details unavailable**, omit | multiple parallel explain rows, public comments, public ratings, public correction fights, hidden score/rank effect |

## v76 Unified Explain Slot

### Purpose

The Unified Explain Slot is the single subordinate explanation surface for the current object. It prevents requirements, guide explanations, placement disclosures, trust snapshots, context notes, support caveats, and funding/verification facts from becoming path-dependent piles of truthful-but-confusing UI.

### Surface placement

| Surface | Exact UX/UI | CTA | Omit / degrade when |
|---|---|---|---|
| **Browse card** | At most one small explain chip inside the two-chip budget: **Why shown?**, **Trust info**, **Context note**, **Guide rule**, or **Policy notice** by priority. | Chip opens detail or Explain sheet; item CTA unchanged. | Omit if it crowds state/exposure/condition/CTA or if no source owner exists. |
| **Detail** | One collapsed row below the first screen: label chosen from **Requirements & rules**, **Why shown?**, **Trust & context**, **Verification & funding**, or **Support details**. | **View details**, **View context**, **View trust details**, **Report issue**, **Back**. | Use **none** if explanation repeats receipt atom or would need a second primary CTA. |
| **Action sheet / review panel** | Show only if decision-critical, as one row below condition/release: **Requirements & rules**, **Credential stale**, **Context note**, or **Review current terms**. | Sheet/review-panel CTA remains receipt CTA or downgraded blocker CTA. | Decorative trust/context rows are omitted. |
| **Plan / Track row** | Show only if row-specific: **Issue pending**, **Terms changed**, **Credential stale**, **Context note**, **Support details**. | Row CTA remains row-owner CTA. | Do not duplicate Account/Profile readiness or context state. |
| **Account/Profile** | Private **Your role readiness** may appear as a row. Context/support issue links appear only if backed. | **Fix requirements**, **View settings**, **View case**, **Back**. | No public trust score, contributor reputation, note history, or public profile context. |
| **Support** | Explain challenge uses fixed reason chips and private note, then backed support row or SafeState. | **Submit issue** only if backed; otherwise **Contact support** / **Back**. | No public complaint, rating, automatic reclassification, public penalty, or direct counterparty chat. |

### Explain sheet / inline panel order

When opened, render sections in this order, omitting unsupported sections:

1. title: chosen label, usually **Details**, **Trust & context**, or **Requirements & rules**;
2. affected object / claim / role;
3. receipt atom reminder: state, exposure, condition/protection, CTA owner;
4. requirements/rules rows if backed;
5. trust snapshot rows if backed;
6. context note rows if backed;
7. funding/verification/privacy rows if backed;
8. facts missing / unknowns;
9. **Effect on this action:** **None**, **Explains why shown**, **Explains blocker**, **Requires adapter recheck**, or **Support-only**;
10. limitation row: **This is context, not a verdict. Trust is not a score.** where trust/context appears;
11. optional private **Report issue** row;
12. **Back**.

### Trust Snapshot section

Use only backed role-specific source owners:

* credential / reviewer / verifier records;
* recipient or cause registry state;
* creator draft/review state;
* authoritative Track row history;
* support issue status;
* review/evidence policy state;
* terms snapshot/current-term revalidation state;
* role-scoped account verification where explicit and consented;
* aggregate completion/issue history only if sample-safe and privacy-safe.

Forbidden trust inputs: external credit, income, job, education, demographics, social graph, contacts, exact location, inferred affiliation, engagement, popularity, private browsing/search/planner state, hidden model features, or social-media metrics.

Trust labels are categorical and scoped: **Role verified**, **Credential current**, **History available**, **History limited**, **Not enough history**, **Issue pending**, **Credential stale**, **Trust data unavailable**, **Support review needed**. They are not scores, ranks, moral claims, or hidden ranking features.

### Context Note section

Use only source-backed, claim-scoped context. A note may attach to:

* card/detail claims such as exposure, preview/live state, evidence burden, verification route, no-charge/release rule;
* guide inclusion/exclusion rules;
* DealScout comparison caveats;
* Trust Snapshot labels;
* reference estimates, mechanism explanations, redacted evidence examples, terms-change rows;
* support/review resolutions where context correction is required.

A note may say **Bridge-reviewed context** only if a backed process shows the note is source-backed, privacy-safe, bounded to one claim, and rated helpful by sufficiently different perspectives or role groups. Otherwise use **Source-backed context**, **Needs review**, **Context unavailable**, or omit.

No public replies, likes, quote posts, comments, public votes, trending, note battles, contributor leaderboards, or social-ranking mechanics.

### Explain challenge path

Inside the Unified Explain Slot, **Report issue** uses reason chips selected by available content:

* **Context seems wrong**
* **Source outdated**
* **Missing important context**
* **Not relevant to this trade**
* **Privacy concern**
* **Trust label seems wrong**
* **Credential stale**
* **Wrong role**
* **Issue already resolved**
* **Other**

The optional note is private/support-scoped. Submission creates a support/review row only if backed; otherwise show **Support intake is not connected yet** or **Details unavailable**. It never creates a public complaint, public correction count, comment thread, automatic re-ranking, public accusation, or direct counterparty chat.

## v76 exact active route UX/UI

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

When live offers are verified, the same shelf may use **Live / Preview / Templates / Examples / Guides**, with **For you** only when real user-scoped signals exist.

Forbidden above the first object: **For you** without real signals, live-looking example cards, fake live count, separate guide row, DealScout row, Trust Snapshot row, Context Note row, second control rail, account/cart/message/Profile widgets, hero banners, or methodology text.

### 2. Public deal-card UX/UI

Each public card is one scan unit:

1. semantic visual tile, 88-112px on row cards;
2. title, maximum two lines;
3. state badge + source label;
4. exposure/metric line: **Max $X**, **No charge now**, **Preview only**, **Template**, **Example**, **Unavailable**, or **Exposure unknown**;
5. one condition/protection line;
6. at most two chips, including at most one explain chip if backed;
7. one CTA pill.

Card body opens detail. Card CTA opens detail, preview sheet, create-from-template, auth, or SafeState. Card CTA does not create a live commitment, payment, support case, public demand, message, evidence state, planner row, trust challenge, or context challenge.

### 3. Detail UX/UI

At 390px width, detail renders:

1. top controls: back, optional search, optional save only if backed;
2. decision block: visual/source/status → title → two-line summary;
3. receipt economics band: state, exposure, condition/protection;
4. one true trust/status strip, max one row;
5. option chips only if real, max two rows;
6. sticky footer: compact receipt atom + one CTA;
7. one collapsed Unified Explain Slot below first screen or none.

Card, economics band, footer, and sheet/review-panel footer must express the same receipt facts unless the handoff intentionally downgrades. A stronger CTA requires backed current-term revalidation and a visible reason. Trust or context cannot justify a stronger CTA by itself.

### 4. Action sheet / review panel UX/UI

At 390px width, a sheet renders:

1. handle/close;
2. object title/source/status;
3. exposure or **No charge now**;
4. condition/review/release row;
5. optional blocker, max one visible blocker;
6. footer receipt atom + one CTA.

On desktop, the review panel mirrors the same order in a right side panel:

1. selected item summary;
2. amount / selected terms;
3. what happens;
4. price & exposure;
5. methods / no-charge state;
6. limitation/release row;
7. one CTA.

| State | Exact UX/UI | CTA | Result |
|---|---|---|---|
| **Preview** | title/source/status → exposure/no-charge → **No commitment will be created** → condition/release → footer/panel | **Preview budget**, **Create similar**, or **Create from template** | sheet result or toast **No commitment was created.** |
| **Commit** | title/source/status → max exposure → activation/charge/review condition → payment/no-payment where backed → release/refund/no-charge rule → one blocker if any → footer/panel | **Authorize pledge** or **Commit conditionally** only after backing and current revalidation pass | owner-row link **Commitment created.** only after mutation and authoritative Track row |
| **Blocked** | title/source/status → blocker reason → unchanged-state line → one recovery path → footer/panel | **Fix requirements**, **Review current terms**, **Sign in to continue**, **Set up later**, or **Back to offers** | **No durable state changed.** |

No payment UI in Preview. No stacked sheets. No success/confetti/order card unless a real durable row exists.

### 5. Plan UX/UI

At 390px width:

1. owner strip **Plan — private selected items. No commitment created.**;
2. one compact tabs/filter row only if backed;
3. first authoritative planner row or SafeState;
4. row CTA;
5. mini tray only if real selected rows exist.

Planner row: row-kind badge → title max two lines → receipt line → latest real planning step → one CTA → overflow. Mini tray may show selected count and max exposure only if derivable. It is not checkout.

At desktop width, Plan may use a wider row list and a bottom or side summary tray. It must not show fake checkout or duplicate Track/Account state.

### 6. Track UX/UI

At 390px width:

1. owner strip **Track — commitments, drafts, and issues.**;
2. one compact tabs row only if backed;
3. first authoritative row or SafeState;
4. row CTA;
5. no duplicate message/account shortcut state.

Track row: row-kind badge → title max two lines → receipt line → latest real step → one CTA → overflow. No fake commitments, pending holds, reviewer queues, ETA, support cases, duplicate Account/Messages/Profile state, trust-score row, context-note thread, or public note status.

### 7. Account / Profile UX/UI

At 390px width:

1. account/auth header;
2. owner strip **Account — saved settings and records.**;
3. Support/Settings shortcuts only if route-safe;
4. compact shortcut grid only for backed route owners;
5. first authoritative row summary, private **Your role readiness** row, backed support/context issue link, or SafeState;
6. preferences below.

Shortcut tiles show label + destination. They do not own counts, status, exposure, CTA, ranks, coins, balances, perks, followers, popularity, row progress, credit score, or note reputation.

### 8. Create UX/UI

Bottom-nav **Create** opens one sheet before any form.

Rows:

1. **Create offer draft** — badge **Draft** or **Unavailable**; CTA **Save draft** or SafeState;
2. **Create from template** — badge **Template**; CTA **Create from template** or **View templates**;
3. **Preview public-goods round** — badge **Preview**; CTA **Preview budget** or SafeState;
4. **Request review** — badge **Reviewing** or **Unavailable**; CTA **Submit for review** or SafeState.

Each row has badge, title, one-line outcome, and one CTA/SafeState. No raw form first. No publish/live CTA without backing and current revalidation.

### 9. Direct-route SafeState UX/UI

Unsupported route, stale ID, auth gate, not-connected feature, missing object, unavailable item, or unavailable explain details renders:

1. short title;
2. one-sentence reason;
3. optional receipt fragment: **Preview only · No commitment**, **Unavailable · Terms changed**, **Not connected yet**, **Sign in required**, **Trust data unavailable**, **Context unavailable**, or **Details unavailable**;
4. one recovery CTA;
5. one optional secondary link.

No raw provider errors, Supabase errors, Stripe errors, stack traces, feature flags, queue IDs, internal enums, raw forms, partial dashboards, credit-score pages, community-note/comment pages, suspense-only shells, or competing CTAs.

## v76 Web/Desktop Mirror Contract

At wider viewports, the desktop UI must be a faithful expansion of the active route, not a separate product.

### Desktop shell

At 1280px and wider, use:

1. fixed left navigation rail: **Browse**, **Plan**, **Track**, **Messages**, **Profile** where backed;
2. top app/search area in the active content column;
3. central object/list area;
4. optional right filter/explain rail only after the first object remains visible;
5. optional review-plan side panel only when a specific object/action is active;
6. no duplicate bottom-nav equivalent unless the viewport is mobile/tablet.

### Desktop Browse

Exact desktop order:

1. left nav;
2. search bar;
3. tab row;
4. safety/context strip: e.g. **Preview only until you confirm · No commitment · No charge · You review every detail**;
5. one combined control row or right quick-filter rail;
6. first receipt-bearing card, preferably a full-width featured row card;
7. secondary card grid;
8. planner tray only if selected/planner rows exist;
9. no production Visual Asset System strip unless the route is a design-system/demo route.

### Desktop Detail

Exact desktop order:

1. breadcrumb/top controls;
2. paired or semantic visual tiles;
3. title and category chips;
4. receipt/trust/status chip row;
5. action row: primary action plus secondary **Compare** / **Save** where backed;
6. overview and key details;
7. recipient/evidence/context cards to the side or below;
8. right review-plan panel when the user is reviewing a plan/action.

### Desktop private routes

Plan, Track, Messages, and Account use row-first layouts:

* owner strip;
* compact tabs/filters if backed;
* authoritative rows or SafeState;
* optional detail pane only after row selection;
* no independent dashboard counts or duplicate row state unless backed by the row owner.

### Desktop visual acceptance

If a task references a desktop mockup, Codex must render a desktop screenshot at the target width, compare region-by-region, and patch the largest mismatches first: geometry, first-screen hierarchy, card morphology, detail/review panel alignment, planner tray, typography/chips/buttons, then visual polish.

## v76 bottom navigation

Default 390px bottom nav:

1. **Browse** — `/offers` or `/`.
2. **Plan** — planner/cart only if backed/local/route-safe; otherwise omit or replace with **Guides** only if guide route is useful and backed.
3. **Create** — opens Create Entry Sheet.
4. **Track** — commitments/pledges and lifecycle rows.
5. **Account** — Profile/My.

Messages lives under Track or Account unless a real lifecycle inbox is more useful than Plan/Guides and route-safe. Matches/DealScout lives under Browse or Plan, not bottom nav by default. Trust Snapshot, Context Notes, and Unified Explain Slot do not get bottom-nav targets. Payment, receipts, evidence, admin, token, relay, queue, refund, support, and notification pages do not become bottom-nav targets in Release A solely because older specs named them.

## v76 deletion rules

When a route is verbose or conflicted, delete/demote in this order:

1. old hero/methodology/theory blocks;
2. second banner, promotion-like strip, decorative notice, large illustration;
3. quick-action strip, spotlight lane, duplicate guide row, DealScout row, Trust Snapshot row above the object, Context Note row above the object, second Explain row;
4. account/cart/message/Profile widget on public Browse;
5. duplicate status, terms, role, mechanism, funding, eligibility, evidence, privacy, support, trust, or context card;
6. second auxiliary class;
7. secondary CTA;
8. chips beyond two visible chips;
9. long mechanism prose, calculations, FAQ, rule text, caveats;
10. decorative or unbacked media;
11. only then tighten spacing within accessibility and touch-target limits.

Never delete or hide source state, status, maximum exposure, obligation, charge/release/no-charge rule, eligibility blocker, privacy/visibility fact where decision-critical, row kind, or primary CTA. Do not keep a trust/context/explain chip if it forces these required facts out of view.

## v76 proof requirement

Use one six-row rendered evidence table unless the repository already has a stricter convention.

| Proof row | Required proof fields |
|---|---|
| **Browse** | verified current scenario, first-render result, first object receipt atom and source owners, first 390px shelf order, desktop mirror if touched, combined rail behavior, first card/empty SafeState, Unified Explain Slot if any, omitted modules, nav, evidence, pass/fail |
| **Detail/Sheet/Review panel** | object key/source owner, same receipt facts on card/detail/footer/sheet/review panel, CTA handoff state, sheet/panel scenario, revalidation/checking copy, result placement/copy, owner row or non-durable result, Unified Explain Slot sections if any, evidence, pass/fail |
| **Plan** | planner backing/local owner or SafeState, first row receipt atom, selected count/exposure derivation, mini tray behavior, desktop row/detail behavior if touched, no checkout/live state from private selection, evidence, pass/fail |
| **Track** | authoritative row owner, first row/SafeState receipt atom, lifecycle state source, invalid-row treatment, row CTA, trust/context issue if any, no duplicate Account/Messages/Profile state, evidence, pass/fail |
| **Account/Create** | Account shortcut ownership, private role-readiness row if any, Create Entry Sheet option receipts, draft/template/review successor row or SafeState, no raw form first, no fake shortcut counts, credit score, or context reputation, evidence, pass/fail |
| **Direct-route safety** | first-render result, SafeState title/reason/recovery CTA, auth return if relevant, unavailable explain details if relevant, no raw errors, no partial route shells, no fake support/durable state, evidence, pass/fail |

Completion cannot be claimed from type definitions, component exports, matching screenshots, or prose. Completion requires route evidence: rendered-route checks, DOM checks, screenshots with state/selector context, page-object actions, Storybook interactions, tests, or a documented stricter equivalent.

## v76 non-negotiable constraints

* Treat this v76 file as the only active implementation target.
* Do not use v1-v75 as an active backlog or appendix.
* Do not create new runtime architecture, proof architecture, acceptance-gate files, receipt-framework files, credit-score engines, community-note/comment systems, social-ranking systems, desktop-framework abstractions, or historical-version appendices solely to satisfy v76.
* Do not implement optional or hypothetical variants before current-state gates pass.
* Do not render route-specific UI before the first-render decision resolves receipt object, empty lane, auth SafeState, not-connected SafeState, unavailable SafeState, safe redirect, or unavailable explain state.
* Do not let Browse show more than search, one tab row, one context line, one combined rail, and the first card/empty state before bottom nav at 390px.
* Do not let non-Browse routes show guide, DealScout, disclosure, support, funding, eligibility, trust, context, account widgets, cart widgets, message widgets, or mechanism facts above the receipt-bearing object.
* Do not allow auxiliary content above the first object; default to none.
* Do not render more than one explain entry for the same object on the same first screen.
* Do not render a public card, detail, sheet, review panel, private row, result, Trust Snapshot, Context Note, Unified Explain Slot, or SafeState without adjacent visible receipt facts or a clear SafeState reason.
* Do not allow receipt-like summaries on the same first screen to disagree.
* Do not let card → detail → sheet/review panel CTA strengthen without backed revalidation and visible reason.
* Do not show a live/review/support/order/payment CTA unless the receipt, selected release, backend mutation, row owner, and current revalidation all allow it.
* Do not show a successor row link unless the row exists and derives from the same object key or declared successor key.
* Do not use generic **Success**, **Joined**, **Order placed**, **Reserved**, **Claimed**, **Hot**, **Best**, **Popular**, **People like you**, numeric credit scores, **信用极好**, **green pass**, moral-score copy, **community agrees**, **viral**, **trending**, likes/reposts/replies counts, public comment, or contributor-rank copy.
* Do not make zero-live mode look live.
* Do not duplicate private row state across Plan, Track, Account, Messages, Profile, Trust Snapshot, Context Note, Unified Explain Slot, and toast/result surfaces.
* Do not use Trust Snapshot, Cross-Perspective Context Notes, or Unified Explain Slot to silently influence feed/search/guide/DealScout rank, hide eligibility blockers, bypass review, accept evidence, alter CTAs, or create moral authority.
* Do not use external credit, consumer-finance, demographics, social graph, exact location, private history, engagement, popularity, replies, reposts, likes, quote posts, or trend data as trust or context-note data.
* Do not solve first-screen density by hiding source/status/exposure/obligation/payment/evidence/privacy/eligibility/CTA facts, using color-only state, relying on hover/tooltips, shrinking text below accessibility limits, or replacing concrete facts with trust/context/explain badges.
* Do not claim v76 completion without six rendered evidence proof rows or a stricter existing route-evidence convention.

## v76 end marker

This is the complete active spec. There are intentionally no historical appendices.
