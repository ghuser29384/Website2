# Codex GPT-5.5 Extra High task: implement a production-grade Meituan-inspired Moral Trade marketplace — v72 terminal implementation-freeze spec

> v72 is a terminal implementation-freeze, current-state patch-loop, and mobile-density hardening pass on top of v71. It does **not** add another feature family, backend system, canonical screen family, runtime framework, proof framework, or Meituan/Taobao/Dianping motif. It makes v71 easier to implement by removing the last procedural escape hatch: Codex must stop inventing new acceptance objects and must patch the smallest failing rendered route in the currently verified state. Older v55-v71 material is safety/backing appendix content only. If older material conflicts with v72, keep the safer truthfulness/privacy rule and use the smaller v72 current-state implementation-freeze shape.

## v72 improvement summary: what changed and why

v71 is directionally correct because it makes acceptance depend on rendered gates rather than prose. It can still be improved. The remaining path-dependency risk is now mostly **implementation-process drift**:

1. Codex may keep refining acceptance terminology instead of editing the actual routes.
2. Codex may build hypothetical live, personalized, payment, support, guide, or DealScout variants before the current rendered zero-live / template / example route is correct.
3. Codex may satisfy the proof rows after the fact while old route-local UI still ships: a second control rail, an auxiliary row above inventory, a dashboard shortcut with its own state, or a partial direct-route shell.
4. Codex may preserve over-tall mobile controls that are technically v71-compliant but still not Meituan-like because the first card does not appear soon enough.

v72 therefore freezes architecture and turns the work into one route patch loop: **verify current state → patch the smallest failing rendered gate → run evidence checks → stop before optional variants**.

Credence for these edits improving implementation rather than worsening it: **0.51**. The benefit is stronger deletion pressure and less proof/abstraction churn. The risk is that v72 is another version, so it explicitly says not to create any new runtime or proof architecture from v72 itself.

## v72 design changes

| v72 design | Improvement over v71 | Specific UX/UI Codex should build or verify | Primary CTA rule | Omit / simplify when |
|---|---|---|---|---|
| **Terminal implementation freeze** | v71 still names a rendered acceptance gate object. v72 says no more architecture objects should be added merely to comply with the spec. | The user-visible product should look the same kind of route as v71, but with less clutter: current-state Browse, first card, detail, sheet/SafeState, private rows, Create sheet, and direct SafeStates. Evidence may be a table, checklist, test, Storybook story, screenshot, or PR note. | No new CTA. This is a build-scope rule. | Do not add `RouteAcceptanceGate`, `AcceptancePacket`, `ReceiptGate`, or similar runtime/framework files unless the repo already has a stricter convention. |
| **Smallest failing route patch loop** | v71 has a stop rule, but not a concrete patch discipline. v72 requires Codex to fix the earliest rendered failure before touching later variants. | Patch order: Browse current state → first card/detail/sheet handoff → direct-route SafeState → Plan/Track current state → Account/Create current state. Each patch changes the smallest existing route/component/adapter set needed to make the rendered screen pass. | CTA may change only when the current route's receipt/source owner changes. | Do not touch DealScout, guide expansion, payment, receipt, support, personalization, or live-commit variants while an earlier rendered gate fails. |
| **Current-state-only first batch** | v71 prioritizes current state; v72 forbids variant implementation in the first batch unless backed by inspection. | If the current inventory has zero live offers, `/offers` is a polished zero-live marketplace: search → tabs **Templates / Examples / Public goods / Guides** → context **No live offers yet · Showing examples and templates** → one combined rail → first Template/Example card or empty lane. | First card CTA is **View details**, **Create similar**, or **Create from template**. | Do not build fake **Live**, **For you**, payment, commitment, review, support, or personalized paths. Represent unsupported variants with SafeState or truthful empty lanes only. |
| **Browse vertical-budget hardening** | v71 says one shelf stack, but an over-tall search/tabs/context/rail block can still push the card too low. v72 gives a concrete budget. | At 390px width, the pre-inventory Browse controls should be compact: search about 44-48px tall, tab row about 32-40px, context about 20-28px, combined rail about 36-44px. The first card or empty lane must start in the initial viewport and be understandable without scrolling past banners or auxiliary rows. | Browse shell has no primary commit CTA. The first card/empty lane owns action. | If the card is not visible soon enough, combine category/filter chips into one rail, shorten context copy, remove auxiliary rows, and delete banners/quick actions before changing receipt facts. |
| **Adjacent receipt atom** | v71 requires adjacent receipt lines but still allows implementations to scatter them across badge row, far-down terms card, and footer. v72 treats them as one scannable atom. | On a card/private row, state/source + exposure + condition/protection + CTA sit within the same compact card/row. On detail, economics band and sticky footer mirror the same atom. On sheet, action facts and footer mirror it. | CTA is part of the atom and cannot be authored separately from the same source owner. | Do not separate exposure into a tooltip, terms into a distant card, or CTA into a different decision band. If crowded, move explanation into **Explain**. |
| **First-object dominance over all auxiliaries** | v71 defaults auxiliary to none; v72 makes the failure test sharper. | At 390px, no Guide, Explain, Support, DealScout, account shortcut, cart widget, message widget, methodology block, or second rail may appear before the first receipt-bearing object. In Browse, only search/tabs/context/one rail may precede inventory. | The first object owns the only primary CTA. | If auxiliary content competes visually with the first object, omit it. Do not merely rename it as Explain. |
| **Variant parking lot** | v71 still lists scenarios; v72 prevents speculative UI work from looking mandatory. | Variants not backed by current inspection are recorded as parked: **live unavailable**, **personalization absent**, **support not connected**, **payment not connected**, **review not connected**, or **route-safe only**. The UI shown for a parked variant is SafeState or omission. | Parked variants have SafeState/recovery CTAs only. | Do not implement parked variants as polished screens with fake rows, fake counts, fake queues, fake success, or hidden disabled states. |
| **Private owner link discipline** | v71 states owner rows; v72 makes Account and Messages visibly link-only unless backed. | Plan shows planner rows. Track shows commitments/drafts/issues/lifecycle rows. Create shows drafts/review submissions until live. Support shows support cases. Account/Profile shows account header, settings, and links to row owners. Messages is omitted or a Track lifecycle link unless a real inbox is backed. | Owner row adapter owns row CTA. Account/Messages shortcuts are labels + destinations, not CTAs over row state. | If a shortcut has no owner row or SafeState, omit it. Do not show independent counts, badges, or progress. |
| **Outcome placement minimalism** | v71 forbids fake success; v72 makes non-durable outcomes even smaller. | No-op/preview/close results are toast or inline copy only: **No durable state changed.** / **No commitment was created.** Planner/draft/review/support/live results link to owner rows only when the row exists. | Result CTA may be **View planner**, **View draft**, **View commitment**, **View case**, **Back to offers**, or none, only when backed. | No full-screen success, fake order receipt, fake support code, queue, ETA, confetti, or generic **Success**. |
| **Evidence minimum as pass/fail, not prose** | v71 requires evidence; v72 says a missing evidence row is failure, not “not checked.” | Each proof row must be **pass** or **fail** for implemented work. **Not checked** means the route is not complete and later optional work must stop. Evidence can be screenshot+DOM, DOM assertion, page-object action, Storybook, Playwright, adapter/unit test, or stricter existing equivalent. | No user CTA. | Do not claim completion from component exports, types, prose, or screenshot alone when the route state/DOM is unverified. |

## v72 canonical architecture rule

Codex must treat v72 as the active Release A implementation shape.

1. **Freeze architecture.** Do not invent another layer after v72. The active work is route implementation and evidence, not more specification.
2. **Use existing code paths where possible.** Existing display adapters, route components, route constants, tests, page objects, Storybook stories, DOM checks, and final-report tables are preferred over new abstractions.
3. **Implement current state first.** A verified zero-live site gets a zero-live Browse route. A route without backing gets SafeState. A missing private row gets empty/private SafeState. Unsupported variants are parked.
4. **Patch the earliest failing rendered gate.** Stop on the first failing route in the v72 patch order and fix it before adding optional utilities.
5. **Browse has one compact shelf.** Search, one tab row, one context line, one combined rail, then first card/empty lane. No second rail or auxiliary row above inventory.
6. **Non-Browse routes show the object first.** Only top controls may precede the receipt-bearing object.
7. **Receipt atom stays adjacent and source-owned.** Identity, state, exposure, condition/protection, CTA, result, and owner row come from source owners or intentionally degrade.
8. **Auxiliary defaults to none.** If present, choose one: Guide, Explain, or Support, below the object.
9. **CTA handoff may match or downgrade.** Card → detail → sheet can strengthen only after visible backed revalidation.
10. **Durable results sync to one owner row.** Plan, Track, Create, or Support owns durable rows. Account and Messages link unless backed as stricter row owners.
11. **Completion requires evidence.** `not_checked` is not completion.

## v72 current-state patch loop

Implement and verify in this order.

| Step | Route / flow | Exact target | Stop condition |
|---|---|---|---|
| 1 | **Browse current state** | At 390px, show search, one tab row, one context line, one combined rail, first Template/Example card or empty lane, and bottom nav. | Stop if the first card/empty lane is not visible and understandable before optional modules. |
| 2 | **First card → detail → sheet/SafeState** | Card opens detail. Detail shows economics receipt atom and footer. Footer opens preview sheet or SafeState. Sheet result copy is non-durable unless a real owner row exists. | Stop if card/detail/sheet receipt lines disagree or CTA strengthens without backed revalidation. |
| 3 | **Direct-route safety** | `/offers/new?mode=offset`, stale detail, `/matches`, `/messages`, `/cart`, `/pledges` or equivalent direct routes render receipt object, empty lane, SafeState, or safe redirect with no raw shell. | Stop if raw provider errors, partial forms, partial dashboards, or suspense-only route shells appear. |
| 4 | **Plan / Track current state** | Plan and Track show owner strip, one compact tabs/filter row if backed, first row or SafeState, one row CTA. | Stop if private rows are duplicated across Plan/Track/Account/Messages or imply checkout/live state. |
| 5 | **Account / Create current state** | Account shows settings/links only. Create opens option-receipt sheet before any form. | Stop if Account shows fake counts or Create routes to raw form first. |
| 6 | **Backed optional variants only** | Guide, Explain, Support, personalized, live, review, payment, receipts, DealScout only if source owners and rendered gates already pass. | Stop if any optional variant crowds first object or creates unbacked state. |

## v72 first-render gate

Every route still starts with the v71/v70 gate, but v72 treats unresolved gate states as ordinary SafeState work, not future-feature work.

| Gate result | Exact UX/UI | CTA rule |
|---|---|---|
| **Receipt object** | Final slot order with adjacent receipt atom. Loading skeletons preserve final slots without route-specific claims. | Receipt CTA only. |
| **Empty receipt lane** | First object slot: title, one reason, optional receipt fragment, one recovery CTA. | **View templates**, **Browse offers**, **Change filters**, **Back to offers** where backed. |
| **Auth SafeState** | **Sign in required**, what remains unchanged, one CTA. After auth, revalidate and require a new tap. | **Sign in to continue**. |
| **Not-connected SafeState** | **Not connected yet**, one reason, one recovery CTA. | **Set up later**, **Back to offers**, or **Contact support** only if backed. |
| **Unavailable SafeState** | **Unavailable** or **Terms changed**, optional object fragment, one recovery CTA. | **Review current terms**, **Find similar**, **Remove**, **Back to offers**, or **Contact support** where backed. |
| **Safe redirect** | Redirect/link to generic `/offers`. | **Browse offers**. |

## v72 evidence row shape

Use or document a stricter existing equivalent. Do **not** add runtime framework files solely to satisfy this shape.

```ts
type V72EvidenceRow = {
  route: string
  currentState: 'zero_live' | 'live_available' | 'signed_out_generic' | 'personalized' | 'private_empty' | 'private_rows' | 'direct_safe' | 'not_connected' | 'unavailable'
  firstRenderedStack: string[]
  receiptAtom: {
    identity: string
    state: string
    exposure: string
    conditionOrProtection: string
    primaryCta: string
    sourceOwners: string[]
  }
  firstAction: {
    trigger: string
    resultPlacement: 'none' | 'toast' | 'inline_row' | 'sheet_result' | 'owner_row_link' | 'safe_state'
    resultCopy: string
    ownerRow: 'Plan' | 'Track' | 'Create' | 'Support' | 'none'
  }
  auxiliary: 'Guide' | 'Explain' | 'Support' | 'none'
  omittedOrDemoted: string[]
  evidence: Array<'dom_assertion' | 'screenshot_with_dom_context' | 'page_object_action' | 'storybook_interaction' | 'playwright' | 'adapter_test' | 'manual_report_with_exact_copy' | 'stricter_existing_equivalent'>
  passFail: 'pass' | 'fail'
}
```

## v72 controlled copy ledger

Use this ledger unless the repository already has stricter equivalent copy.

| Receipt line | Allowed copy | Degrade to | Forbidden copy |
|---|---|---|---|
| **State** | **Live**, **Preview**, **Template**, **Example**, **Unavailable**, **Draft**, **Reviewing**, **Action needed**, **Done**, **Issue**, **Safe** | **Preview**, **Unavailable**, **Safe** | raw enums, feature flags, **Hot**, **Best**, **Popular**, **Deal**, **Claimed**, **Ready**, **All set** |
| **Exposure** | **Max $X**, **No charge now**, **Preview only**, **Exposure unknown**, **Not connected**, **Unavailable** | **Exposure unknown**, **Not connected**, **Unavailable** | hidden exposure, tooltip-only exposure, fake discount/savings/cheap/free copy |
| **Condition** | **Review required**, **No commitment**, **Terms changed**, **Sign in required**, **Eligibility unknown**, **Not connected**, **No durable state changed** | **Review current terms**, **Eligibility unknown**, **Not connected** | **success**, **joined**, **reserved**, **matched**, **order placed**, **approved**, **guaranteed** without exact backed state |
| **Protection/privacy** | **No commitment will be created**, **Private planning only**, **Lifecycle updates only**, **No counterparty chat**, **Authorization released if not cleared**, **Support intake not connected yet** | **Private planning only**, **Not connected** | fake refund guarantee, fake privacy guarantee, public proof, direct counterparty chat, hidden obligations |
| **Primary CTA** | **View details**, **Preview budget**, **Create similar**, **Create from template**, **Sign in to continue**, **Save draft**, **Submit for review**, **Authorize pledge**, **Commit conditionally**, **Review current terms**, **Fix requirements**, **View guide**, **Back to offers**, **Browse offers**, **Set up later**, **Contact support** | **View details**, **Review current terms**, **Back to offers**, **Browse offers** | **Buy**, **Join**, **Checkout**, **Claim**, **Grab**, **Hot deal**, **People like you**, **Best moral trade** |
| **Result** | **No durable state changed.**, **No commitment was created.**, **Added to planner. No commitment created.**, **Draft saved. No commitment created.**, **Submitted for review. No live commitment created.**, **Signed in. Review current terms before continuing.**, **Commitment created.** only after real mutation and authoritative row | **Could not confirm. Review current state.**, **No durable state changed.** | generic **Success**, fake order row, fake receipt, fake support code, fake queue, fake ETA |

## v72 exact active route UX/UI

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

No **For you**, no live-looking card, no fake live count, no separate guide row above the first card, no second rail.

### 2. Public deal-card UX/UI

Each public card is one scan unit:

1. semantic visual tile, 88-112px on row cards;
2. title, maximum two lines;
3. state badge + source label;
4. exposure/metric line: **Max $X**, **No charge now**, **Preview only**, **Template**, **Example**, **Unavailable**, or **Exposure unknown**;
5. one condition/protection line;
6. at most two chips;
7. one CTA pill.

Card body opens detail. Card CTA opens detail, preview sheet, create-from-template, auth, or SafeState. Card CTA does not create a live commitment, payment, support case, public demand, message, evidence state, or planner row.

### 3. Detail UX/UI

At 390px width, detail renders:

1. top controls: back, optional search, optional save only if backed;
2. decision block: visual/source/status → title → two-line summary;
3. receipt economics band: state, exposure, condition/protection;
4. one true trust strip, max one row;
5. option chips only if real, max two rows;
6. sticky footer: compact receipt atom + one CTA;
7. one collapsed **Explain** row below first screen, usually **Requirements & rules**, or none.

Card, economics band, footer, and sheet footer must express the same receipt facts, unless the handoff intentionally downgrades. A stronger CTA requires backed current-term revalidation and visible reason.

### 4. Action-sheet UX/UI

At 390px width, sheet renders:

1. handle/close;
2. object title/source/status;
3. exposure or **No charge now**;
4. condition/review/release row;
5. optional blocker, max one visible blocker;
6. footer receipt atom + one CTA.

Preview sheet result: sheet result or toast **No commitment was created.**
Close/no-op result: **No durable state changed.**
Commit result: owner-row link **Commitment created.** only after mutation and authoritative Track row.

No payment UI in Preview. No stacked sheets. No success/confetti/order card unless a real durable row exists.

### 5. Plan UX/UI

At 390px width:

1. owner strip **Plan — private selected items. No commitment created.**;
2. one compact tabs/filter row only if backed;
3. first authoritative planner row or SafeState;
4. row CTA;
5. mini tray only if real selected rows exist.

Planner row: row-kind badge → title max two lines → receipt line → latest real planning step → one CTA → overflow. Mini tray may show selected count and max exposure only if derivable. It is not checkout.

### 6. Track UX/UI

At 390px width:

1. owner strip **Track — commitments, drafts, and issues.**;
2. one compact tabs row only if backed;
3. first authoritative row or SafeState;
4. row CTA;
5. no duplicate message/account shortcut state.

Track row: row-kind badge → title max two lines → receipt line → latest real step → one CTA → overflow. No fake commitments, pending holds, reviewer queues, ETA, support cases, or duplicate Account/Messages/Profile state.

### 7. Account / Profile UX/UI

At 390px width:

1. account/auth header;
2. owner strip **Account — saved settings and records.**;
3. Support/Settings shortcuts only if route-safe;
4. compact shortcut grid only for backed route owners;
5. first authoritative row summary or SafeState;
6. preferences below.

Shortcut tiles show label + destination. They do not own counts, status, exposure, CTA, ranks, coins, balances, perks, followers, popularity, or row progress.

### 8. Create UX/UI

Bottom-nav **Create** opens one sheet before any form. Rows:

1. **Create offer draft** — badge **Draft** or **Unavailable**; CTA **Save draft** or SafeState;
2. **Create from template** — badge **Template**; CTA **Create from template** or **View templates**;
3. **Preview public-goods round** — badge **Preview**; CTA **Preview budget** or SafeState;
4. **Request review** — badge **Reviewing** or **Unavailable**; CTA **Submit for review** or SafeState.

Each row has badge, title, one-line outcome, and one CTA/SafeState. No raw form first. No publish/live CTA without backing and current revalidation.

### 9. Auxiliary UX/UI

Default is **none**.

| Auxiliary | Specific UX/UI | CTA | Omit when |
|---|---|---|---|
| **Guide** | One **Guides** tab or below-card chip. Guide detail: **Guides use rules, not popularity** → source chips → receipt-card list → **Why this guide?** | **View guide**; item CTA remains item receipt CTA. | Rule cannot be computed/disclosed, or guide would appear above the first object. |
| **Explain** | One collapsed row below object: **Requirements & rules**, **Why shown?**, **Verification & funding**, or stricter equivalent. | **View requirements**, **View rules**, **Back**, **View rule details**. | It repeats receipt lines, needs a second CTA, or crowds first object. |
| **Support** | Fixed reason chips → optional private note → visibility row → backed support row or SafeState. | **Contact support** / **Submit issue** only when backed. | Support path is not backed or would imply public complaint/rating/chat/fake progress. |

DealScout, if present, is **Explain** by default and must use visible/backed display models only. It cannot negotiate, discover contacts, auto-select, auto-commit, or create hidden outreach.

### 10. Direct-route SafeState UX/UI

Unsupported route, stale ID, auth gate, not-connected feature, missing object, or unavailable item renders:

1. short title;
2. one-sentence reason;
3. optional receipt fragment: **Preview only · No commitment**, **Unavailable · Terms changed**, **Not connected yet**, or **Sign in required**;
4. one recovery CTA;
5. one optional secondary link.

No raw provider errors, Supabase errors, Stripe errors, stack traces, feature flags, queue IDs, internal enums, raw forms, partial dashboards, or competing CTAs.

## v72 bottom navigation

Default 390px bottom nav:

1. **Browse** — `/offers` or `/`.
2. **Plan** — planner/cart only if backed/local/route-safe; otherwise omit or replace with **Guides** only if guide route is useful and backed.
3. **Create** — opens Create Entry Sheet.
4. **Track** — commitments/pledges and lifecycle rows.
5. **Account** — Profile/My.

Messages lives under Track or Account unless a real lifecycle inbox is more useful than Plan/Guides and route-safe. Matches/DealScout lives under Browse or Plan, not bottom nav by default. Payment, receipts, evidence, admin, token, relay, queue, refund, support, and notification pages do not become bottom-nav targets in Release A solely because older specs named them.

## v72 deletion rules

When a route is verbose or conflicted, delete/demote in this order:

1. old hero/methodology/theory blocks;
2. second banner, promotion-like strip, decorative notice, large illustration;
3. quick-action strip, spotlight lane, duplicate guide row, DealScout row;
4. account/cart/message/Profile widget on public Browse;
5. duplicate status, terms, role, mechanism, funding, eligibility, evidence, privacy, support card;
6. second auxiliary class;
7. secondary CTA;
8. chips beyond two visible chips;
9. long mechanism prose, calculations, FAQ, rule text, caveats;
10. decorative or unbacked media;
11. only then tighten spacing within accessibility and touch-target limits.

Never delete or hide source state, status, maximum exposure, obligation, charge/release/no-charge rule, eligibility blocker, privacy/visibility fact where decision-critical, row kind, or primary CTA.

## v72 proof requirement

Use one six-row rendered evidence table unless the repository already has a stricter convention.

| Proof row | Required proof fields |
|---|---|
| **Browse** | verified current scenario, first-render gate result, first object receipt atom and source owners, first 390px shelf order, combined rail behavior, first card/empty SafeState, auxiliary, omitted modules, bottom nav, evidence, pass/fail |
| **Detail/Sheet** | object key/source owner, same receipt facts on card/detail/footer/sheet, CTA handoff state, sheet scenario, revalidation/checking copy, result placement/copy, owner row or non-durable result, auxiliary, evidence, pass/fail |
| **Plan** | planner backing/local owner or SafeState, first row receipt atom, selected count/exposure derivation, mini tray behavior, no checkout/live state from private selection, evidence, pass/fail |
| **Track** | authoritative row owner, first row/SafeState receipt atom, lifecycle state source, invalid-row treatment, row CTA, no duplicate Account/Messages/Profile state, evidence, pass/fail |
| **Account/Create** | Account shortcut ownership, Create Entry Sheet option receipts, draft/template/review successor row or SafeState, no raw form first, no fake shortcut counts, evidence, pass/fail |
| **Direct-route safety** | first-render gate result, SafeState title/reason/recovery CTA, auth return if relevant, no raw errors, no partial route shells, no fake support/durable state, evidence, pass/fail |

Completion cannot be claimed from type definitions, component exports, matching screenshots, or prose. Completion requires route evidence: rendered-route checks, DOM checks, screenshots with state/selector context, page-object actions, Storybook interactions, tests, or a documented stricter equivalent.

## v72 non-negotiable additions

* Treat this v72 file as the active implementation target.
* Do not use v55-v71 as an active backlog.
* Do not create new runtime architecture, proof architecture, acceptance-gate files, or receipt-framework files solely to satisfy v72.
* Do not iterate the spec again unless rendered route evidence shows a concrete defect that v72 cannot express.
* Do not implement optional or hypothetical variants before current-state gates pass.
* Do not render route-specific UI before the first-render gate resolves receipt object, empty lane, auth SafeState, not-connected SafeState, unavailable SafeState, or safe redirect.
* Do not let Browse show more than search, one tab row, one context line, one combined rail, and the first card/empty state before bottom nav at 390px.
* Do not let non-Browse routes show guide, DealScout, disclosure, support, funding, eligibility, account widgets, cart widgets, message widgets, or mechanism facts above the receipt-bearing object.
* Do not allow auxiliary content above the first object; default to none.
* Do not render a public card, detail, sheet, private row, result, or SafeState without adjacent visible receipt facts or a clear SafeState reason.
* Do not allow receipt-like summaries on the same first screen to disagree.
* Do not let card → detail → sheet CTA strengthen without backed revalidation and visible reason.
* Do not show a live/review/support/order/payment CTA unless the receipt, selected release, backend mutation, row owner, and current revalidation all allow it.
* Do not show a successor row link unless the row exists and derives from the same object key or declared successor key.
* Do not use generic **Success**, **Joined**, **Order placed**, **Reserved**, **Claimed**, **Hot**, **Best**, **Popular**, or **People like you** copy.
* Do not make zero-live mode look live.
* Do not duplicate private row state across Plan, Track, Account, Messages, Profile, and toast/result surfaces.
* Do not solve first-screen density by hiding source/status/exposure/obligation/payment/evidence/privacy/eligibility/CTA facts, using color-only state, relying on hover/tooltips, or shrinking text below accessibility limits.
* Do not claim v72 completion without six rendered evidence proof rows or a stricter existing route-evidence convention.

---

## Appendix A — v71 source retained as safety/backing context

# Codex GPT-5.5 Extra High task: implement a production-grade Meituan-inspired Moral Trade marketplace — v71 rendered-acceptance-gate spec

> v71 is a current-state-first, rendered-acceptance-gate, and measurable-density pass on top of v70. It does **not** add another feature family, backend system, canonical screen family, runtime framework, or Meituan/Taobao/Dianping motif. It keeps v70's Route Acceptance Packet discipline, but removes the remaining risk that the packet becomes another prose artifact by making acceptance depend on three rendered gates: **current scenario**, **first-object dominance**, and **action/result ownership**. Older v55-v70 material is safety/backing appendix content only. If older material conflicts with v71, keep the safer truthfulness/privacy rule and use the smaller v71 rendered-acceptance-gate shape.

## v71 improvement summary: what changed and why

v70 is directionally correct because it turns rendered fixtures into Route Acceptance Packets and prioritizes the currently verified state. It can still be improved. The remaining path-dependency risk is that the acceptance packet can still be satisfied as a documentation layer after the route is already built, while the actual route keeps older page-local UI: an extra control rail, an auxiliary module that behaves like a feature family, a private dashboard shortcut with its own state, a partial direct-route shell, or a detail footer that silently strengthens the card CTA.

v71 therefore makes the acceptance rule smaller and more operational:

1. **Current scenario first.** Verify and implement the current inventory/auth/backing state before live/personalized/payment/review variants.
2. **Rendered gate, not artifact.** A route passes only when the rendered route itself satisfies the gate; a packet/table merely records evidence.
3. **One measurable mobile stack.** At 390px width, Browse gets exactly four control rows before inventory; non-Browse routes get only top controls before the receipt-bearing object.
4. **Auxiliary defaults to none.** Auxiliary content is allowed only when it improves the current decision and stays below the object.
5. **CTA and result identity stay locked across handoff.** Card → detail → sheet → result may downgrade for safety, but may not strengthen without a backed revalidation reason.

Credence for these edits improving implementation rather than worsening it: **0.51**. The benefit is lower route/proof ambiguity and stronger deletion pressure. The risk is marginal over-specification, so v71 explicitly forbids new runtime gate or packet files unless the repository already uses that convention.

## v71 design changes

| v71 design | Improvement over v70 | Specific UX/UI Codex should build or verify | Primary CTA rule | Omit / simplify when |
|---|---|---|---|---|
| **Rendered Acceptance Gates** | v70 still permits a Route Acceptance Packet to exist as a report. v71 makes the rendered route the acceptance object. | For every active route, verify three gates in the rendered route: **Scenario Gate** (actual inventory/auth/backing), **First-Object Gate** (the dominant object is visible with receipt lines), and **Action/Result Gate** (first tap has exact result copy and row owner or non-durable result). The table only records this evidence. | CTA is accepted only if visible in the rendered object and owned by the same source owner named by the gate. | Do not add `RouteAcceptanceGate` runtime files. Use DOM assertions, page-object checks, Storybook interactions, Playwright, screenshots, or final-report rows. |
| **Current-State First Batch** | v70 prioritizes current state, but still lists many variants beside it. v71 makes unsupported variants SafeState evidence, not implementation work. | Codex must first inspect whether the site has live offers, templates/examples, planner rows, commitment rows, auth state, Create backing, support backing, and direct-route health. If current live count is zero, Browse is zero-live and live variants receive only truthful empty lanes or SafeState. | CTA follows current backing, not hypothetical future release states. | Do not build fake live, fake personalized, fake payment, fake support, or fake review flows for variant coverage. |
| **Measurable Browse Stack** | v70 has one combined control rail but still leaves room for vertical creep. v71 defines the exact mobile stack. | At 390px width, Browse renders: sticky search → one tab row → one context/status line → one horizontal control rail → first receipt-bearing card or empty lane → optional below-object auxiliary → bottom nav. The first card/empty state must appear before any guide, DealScout, account, cart, message, methodology, spotlight, or second rail. | Browse shell has no commit CTA. The first card/empty lane owns the CTA. | If controls are too tall, combine filters into the rail or move lower-priority controls below the first card. No category grid plus filter row above the card. |
| **First-Object Dominance Test** | v70 says the receipt-bearing object must dominate; v71 defines failure precisely. | The first object passes only if the user can see identity, state, exposure, condition/protection, and one CTA/recovery action without opening an expander. For Detail/Sheet/Plan/Track/Account/Create/Safe routes, no guide/disclosure/support/dashboard content appears before this object. | The first object owns the only primary CTA. | If a secondary module competes visually with the first object, demote it below the object, collapse it as Explain, or omit it. |
| **Adjacent Receipt Lines** | v70 permits the same lines to exist but not necessarily together. v71 requires the receipt facts to be adjacent enough to scan like a marketplace row. | On cards and private rows, state/source, exposure, condition/protection, and CTA sit in one compact row/card unit. On Detail, the same facts sit in the economics band and sticky footer. On Sheet, they sit in the action facts and footer. | Components cannot separate exposure from CTA into distant page regions to make the surface look cleaner. | If the facts do not fit, shorten controlled copy or move explanation into Explain. Do not hide exposure in tooltip/hover/color. |
| **CTA Handoff Lock** | v70 requires continuity, but v71 makes the CTA transition itself explicit. | Card CTA → Detail footer CTA → Sheet footer CTA must either match in strength or intentionally downgrade. Example: **Preview budget** may stay **Preview budget** or downgrade to **Review current terms**; it may not become **Authorize pledge** without backed revalidation and visible reason. | Stronger CTA appears only after current-term revalidation and selected-release backend gates pass. | Do not add a second warning card or a duplicate footer to justify a stronger action. Degrade the existing CTA. |
| **Auxiliary Default-None Rule** | v70 collapses auxiliary classes to Guide/Explain/Support/none; v71 sets the default to none. | Auxiliary UI appears only when it helps the current route's first decision. **Guide** may be a tab/chip or guide page. **Explain** is one collapsed row such as **Requirements & rules**. **Support** is fixed reason chips after explicit support entry. Otherwise no auxiliary row appears above the fold. | Auxiliary CTA is secondary: **View guide**, **View requirements**, **View rules**, **Back**, **View rule details**, or **Contact support** where backed. | Omit auxiliary content if it repeats receipt lines, needs another primary action, or pushes the first object down. |
| **Private Link Surface Rule** | v70 says Account is mostly a link surface; v71 applies the same discipline to Messages and shortcuts. | Plan owns private selected rows. Track owns commitments, live rows, issues, and lifecycle rows. Create owns drafts/review submissions until live. Support owns support cases. Account and Messages mostly show links to owner rows. Shortcuts show label + destination, not independent status. | Owner row adapter owns the CTA. Account/Profile/Messages shortcuts do not own primary CTAs for row state. | If the owner row is absent, show a SafeState or omit the shortcut. Do not show fake counts/status/progress. |
| **Outcome Placement Lock** | v70 defines result placement; v71 prevents full-screen or route-local success pages from reappearing. | Non-durable results appear as a small toast, inline row, or sheet result. Private durable results appear as toast + owner-row link only if row exists. Live commitment appears only as Track owner-row link after mutation. | Result CTA may link only to existing owner row or safe recovery. | No full-screen success, fake order receipt, fake support code, fake queue, fake ETA, confetti, or generic **Success**. |
| **Evidence-Minimum Stop Rule** | v70 requires evidence checks but not the implementation order when evidence fails. v71 adds a stop rule. | Implement in this order: Browse current state → first card/detail/sheet handoff → direct-route SafeState → Plan/Track current state → Account/Create. If an earlier route fails its rendered gate, stop and fix it before adding optional utilities or variant work. | No user CTA. This is an implementation discipline. | Do not proceed to DealScout, guides, payment, support, receipts, or personalized variants while Browse/current handoff fails. |

## v71 canonical architecture rule

Codex must treat v71 as the active Release A implementation shape.

1. **Only v71 is active build shape.** v55-v70 are safety/backing appendix material unless v71 explicitly pulls a detail into a rendered gate, receipt line, auxiliary row, SafeState reason, or proof check.
2. **Every route starts with the First-Render Gate from v70.** Before route-specific copy appears, resolve one receipt object, one empty lane, auth SafeState, not-connected SafeState, unavailable SafeState, or safe redirect.
3. **Acceptance is rendered, not declared.** A packet/table is sufficient only if it records real rendered evidence.
4. **Current-state scenario comes first.** Build and prove the actually verified site state before hypothetical live/personalized/payment/review/support states.
5. **Browse uses one shelf stack.** Search, one tab row, one context line, one combined rail, then first receipt card/empty lane. No second rail or auxiliary module above inventory.
6. **Non-Browse routes show the object first.** Only top controls may precede the receipt-bearing object.
7. **Receipt lines stay adjacent and source-owned.** Identity, state, exposure, condition/protection, CTA, result, and owner row are visible or intentionally degraded.
8. **Auxiliary content defaults to none.** If present, choose at most one: Guide, Explain, Support. It stays below the object unless the current route is explicitly a guide/support route.
9. **CTA handoffs can only match or downgrade before revalidation.** A stronger action requires backed revalidation and visible reason.
10. **Every durable result syncs to one owner row.** Plan, Track, Create, or Support owns durable rows. Account and Messages link unless they have their own stricter backed row model.
11. **Do not add runtime architecture merely to satisfy v71.** Use existing display adapters, route components, route constants, tests, DOM checks, Storybook stories, screenshots, page-object actions, Playwright, or final-report mappings.

## v71 rendered acceptance gates

These gates replace any temptation to treat the acceptance packet as a separate design artifact.

| Gate | What must be verified | Exact UX/UI pass condition | Fail-closed behavior |
|---|---|---|---|
| **Scenario Gate** | Current inventory, live count, examples/templates, auth state, private rows, Create backing, support backing, and direct-route health. | The route renders the current verified scenario. Zero-live renders examples/templates; empty/private routes render empty lanes/SafeState; unsupported routes render SafeState. | Use empty lane, unavailable/not-connected SafeState, or safe redirect. Do not build fake variants. |
| **First-Object Gate** | First receipt-bearing object or SafeState exists and is visible in the first mobile viewport at 390px width. | Object shows identity, state, exposure, condition/protection, and one CTA/recovery action without expander. Browse controls may precede it; non-Browse route content may not. | Delete/demote controls, banners, auxiliary rows, dashboard widgets, second CTAs, and extra chips until it passes. |
| **Action/Result Gate** | First visible CTA/row action has a known max durable effect, result placement, result copy, and owner row or non-durable state. | Tapping the CTA yields exact copy such as **No commitment was created.**, **Added to planner. No commitment created.**, **Draft saved. No commitment created.**, or an owner-row link only after backed mutation. | Degrade CTA to **View details**, **Review current terms**, **Back to offers**, **Browse offers**, or SafeState. |
| **Evidence Gate** | One route-level evidence type is attached. | Evidence is at least one of: DOM assertion, screenshot plus DOM/state owner, page-object action, Storybook interaction, Playwright test, adapter test, manual report with exact selectors/copy, or stricter existing equivalent. | `not_checked` is not completion. Stop before optional work. |

## v71 Route Acceptance Gate shape

Use or document a stricter existing equivalent. Do **not** add a runtime framework solely to satisfy this shape.

```ts
type AuxiliaryClassV71 = 'Guide' | 'Explain' | 'Support' | 'none'

type RouteAcceptanceGateV71 = {
  route: string
  currentScenario:
    | 'zero_live'
    | 'live_available'
    | 'signed_out_generic'
    | 'personalized'
    | 'detail_decide'
    | 'sheet_preview'
    | 'sheet_commit'
    | 'sheet_blocked'
    | 'plan_empty_or_rows'
    | 'track_empty_or_rows'
    | 'account'
    | 'create_entry'
    | 'direct_safe'
  gateResult:
    | 'receipt_object'
    | 'empty_receipt_lane'
    | 'auth_safe_state'
    | 'not_connected_safe_state'
    | 'unavailable_safe_state'
    | 'safe_redirect'
  first390VisibleStack: string[]
  receiptLines: {
    identity: { copy: string; sourceOwner: string }
    state: { copy: 'Live' | 'Preview' | 'Template' | 'Example' | 'Unavailable' | 'Draft' | 'Reviewing' | 'Action needed' | 'Done' | 'Issue' | 'Safe'; sourceOwner: string }
    exposure: { copy: string; sourceOwner: string }
    condition: { copy: string; sourceOwner: string }
    protectionOrPrivacy?: { copy: string; sourceOwner: string }
    primaryCta: { copy: string; sourceOwner: string }
  }
  firstAction: {
    trigger: string
    maxDurableEffect:
      | 'none'
      | 'route_state_only'
      | 'local_or_session_private_selection'
      | 'private_planner_row'
      | 'private_draft_or_review_row'
      | 'private_support_case'
      | 'live_commitment_row'
    resultPlacement: 'none' | 'toast' | 'inline_row' | 'sheet_result' | 'owner_row_link' | 'safe_state'
    resultCopy: string
    ownerRow?: 'Plan' | 'Track' | 'Create' | 'Support' | 'none'
  }
  auxiliaryClass: AuxiliaryClassV71
  auxiliaryUx: string
  omittedOrDemotedModules: string[]
  evidence: Array<'dom_assertion' | 'screenshot' | 'page_object_action' | 'storybook_interaction' | 'playwright' | 'adapter_test' | 'manual_report' | 'stricter_existing_equivalent'>
  passFail: 'pass' | 'fail' | 'not_checked'
}
```

## v71 controlled copy ledger

Use this ledger unless the repository already has stricter equivalent copy.

| Receipt line | Allowed copy | Degrade to | Forbidden copy |
|---|---|---|---|
| **State** | **Live**, **Preview**, **Template**, **Example**, **Unavailable**, **Draft**, **Reviewing**, **Action needed**, **Done**, **Issue**, **Safe** | **Preview**, **Unavailable**, **Safe** | raw enums, feature flags, **Hot**, **Best**, **Popular**, **Deal**, **Claimed**, **Ready**, **All set** |
| **Exposure** | **Max $X**, **No charge now**, **Preview only**, **Exposure unknown**, **Not connected**, **Unavailable** | **Exposure unknown**, **Not connected**, **Unavailable** | hidden exposure, tooltip-only exposure, fake discount/savings/cheap/free copy |
| **Condition** | **Review required**, **No commitment**, **Terms changed**, **Sign in required**, **Eligibility unknown**, **Not connected**, **No durable state changed** | **Review current terms**, **Eligibility unknown**, **Not connected** | **success**, **joined**, **reserved**, **matched**, **order placed**, **approved**, **guaranteed** without exact backed state |
| **Protection/privacy** | **No commitment will be created**, **Private planning only**, **Lifecycle updates only**, **No counterparty chat**, **Authorization released if not cleared**, **Support intake not connected yet** | **Private planning only**, **Not connected** | fake refund guarantee, fake privacy guarantee, public proof, direct counterparty chat, hidden obligations |
| **Primary CTA** | **View details**, **Preview budget**, **Create similar**, **Create from template**, **Sign in to continue**, **Save draft**, **Submit for review**, **Authorize pledge**, **Commit conditionally**, **Review current terms**, **Fix requirements**, **View guide**, **Back to offers**, **Browse offers**, **Set up later**, **Contact support** | **View details**, **Review current terms**, **Back to offers**, **Browse offers** | **Buy**, **Join**, **Checkout**, **Claim**, **Grab**, **Hot deal**, **People like you**, **Best moral trade** |
| **Result** | **No durable state changed.**, **No commitment was created.**, **Added to planner. No commitment created.**, **Draft saved. No commitment created.**, **Submitted for review. No live commitment created.**, **Signed in. Review current terms before continuing.**, **Commitment created.** only after real mutation and authoritative row | **Could not confirm. Review current state.**, **No durable state changed.** | generic **Success**, fake order row, fake receipt, fake support code, fake queue, fake ETA |

## v71 exact active route UX/UI

### 1. Browse rendered gate — `/` and `/offers`

**Task:** Browse.
**Gate:** receipt object or empty receipt lane.
**Meituan-like shape:** one compact shelf stack, then inventory.

At 390px width, Browse renders exactly:

1. sticky search bar: **Search causes, templates, rounds**;
2. one tab row;
3. one context/status line;
4. one combined horizontal control rail;
5. first receipt-bearing card or lane empty SafeState;
6. optional auxiliary class below the first card;
7. bottom nav.

Scenarios:

| Scenario | First 390px UX/UI | First object receipt | Auxiliary default | Omit / simplify |
|---|---|---|---|---|
| **Zero-live** | Search → tabs **Templates / Examples / Public goods / Guides** → **No live offers yet · Showing examples and templates** → combined rail → first Template/Example card. | identity = template/example title; state = **Template** or **Example**; exposure = **Preview only** or **No commitment**; condition = **No commitment**; CTA = **View details**, **Create similar**, or **Create from template**. | **none**; **Guide** only if it stays below first card or appears as the Guides tab. | No **For you** without real signals, no live-looking card, no fake live count, no separate guide row above card. |
| **Live-available** | Search → tabs **Live / Preview / Templates / Examples / Guides**, with **For you** first only if backed → context → combined rail → first Live/Preview card. | state = **Live** or **Preview**; exposure visible; condition visible; CTA from display model. | Usually **none**; at most one **Guide** or **Explain** below first card. | Do not let guide, spotlight, quick-action, account/cart/message, or second filter row push first card down. |
| **Signed-out generic** | Search → public tabs → **Generic preview feed** → combined rail → first public card or empty state. | no private reason chip; state from public display model. | **none**. | No saved counts, local routine, user priority, hidden preference, private row, or auth-only status on public cards. |
| **Personalized** | Search → **For you** plus source tabs → **Personalized from your priorities** or **Using local history** with **Tune** → combined rail → first card with at most one reason chip. | reason appears as one **Why shown?** chip; receipt lines still source-state-owned. | **Explain** only via **Why shown?** | Fall back to generic if signals are absent, stale, unsafe, or unconsented. |

Browse shell has no commit CTA. Card body opens detail. Card CTA opens detail, preview sheet, create-from-template, auth, or SafeState only.

### 2. Public deal-card rendered gate

At 390px, each public card is one scan unit:

1. semantic visual tile, 88-112px on row cards;
2. title, maximum two lines;
3. state badge + source label;
4. exposure/metric line: **Max $X**, **No charge now**, **Preview only**, **Template**, **Example**, **Unavailable**, or **Exposure unknown**;
5. one condition/protection line: **Review required**, **No commitment**, **Terms changed**, **Not connected**, **Sign in required**, or equivalent backed copy;
6. at most two chips;
7. one CTA pill.

No paragraph body, second primary CTA, public popularity, fake progress, coupon copy, countdown, fake image proof, or **Best / Hot / Popular** copy.

Card body tap is view-only and opens detail. Card CTA may not create a live commitment, payment, support case, public demand, message, evidence state, or planner row. Save/select affordances are private planning only and use **Added to planner. No commitment created.** only when a planner row exists.

### 3. Detail rendered gate — offer/template/example detail

**Task:** Decide.
**Gate:** receipt object, unavailable SafeState, or auth SafeState.
**Meituan/Taobao shape:** compact deal detail with sticky decision footer.

At 390px width, Detail renders:

1. top controls: back, optional search, optional save only if backed;
2. decision block: visual/source/status → title → two-line summary;
3. receipt economics band: state, exposure, condition/protection;
4. one true trust strip, max one row;
5. option chips only if real, max two rows;
6. sticky footer: compact receipt capsule + one CTA;
7. one collapsed **Explain** row below first screen, usually **Requirements & rules**, or none.

Continuity:

* Card, detail economics band, detail footer, and sheet footer must express the same state/exposure/condition/protection lines.
* CTA may match or downgrade before revalidation. It may strengthen only after visible, backed current-term revalidation.
* If current terms are stale, footer CTA becomes **Review current terms**.
* If exposure is missing, show **Exposure unknown** and degrade CTA to **View details**, **Review current terms**, or SafeState.

No theory essay, route map, long legal/tax caveat, role map, mechanism prose, duplicate funding card, or duplicate eligibility card appears above the economics band.

### 4. Action-sheet rendered gate

**Task:** Act.
**Gate:** receipt object, unavailable SafeState, not-connected SafeState, or blocked sheet.
**Taobao shape:** one bottom sheet, one footer action, no stacked modal.

At 390px width, every sheet renders:

1. handle/close;
2. object title/source/status;
3. exposure or **No charge now**;
4. condition/review/release row;
5. optional blocker, max one visible blocker;
6. footer receipt capsule + one CTA.

| Sheet scenario | Exact UX/UI | CTA | Result placement and copy |
|---|---|---|---|
| **Preview** | title/source/status → exposure/no-charge → **No commitment will be created** → condition/release → footer | **Preview budget**, **Create similar**, or **Create from template** | sheet result or toast: **No commitment was created.** |
| **Commit** | title/source/status → max exposure → activation/charge/review condition → payment/no-payment where backed → release/refund/no-charge rule → one blocker if any → footer | **Authorize pledge** or **Commit conditionally** only if selected release, server mutation, review, payment/evidence/privacy gates, and current revalidation all pass | owner row link: **Commitment created.** only after mutation and authoritative Track row |
| **Blocked** | title/source/status → blocker reason → unchanged-state line → one recovery path → footer | **Fix requirements**, **Review current terms**, **Sign in to continue**, **Set up later**, or **Back to offers** | sheet result: **No durable state changed.** |

No payment UI appears in Preview. Pending copy appears only in the footer CTA row. No success/confetti/order card appears unless a backed durable row exists.

### 5. Plan rendered gate — `/cart` or planner

**Task:** Plan.
**Gate:** private row, empty receipt lane, auth SafeState, or not-connected SafeState.
**Taobao shape:** private cart-like rows without checkout illusion.

At 390px width:

1. owner strip: **Plan — private selected items. No commitment created.**;
2. one compact tabs/filter row only if backed;
3. first authoritative planner row or SafeState;
4. row CTA;
5. mini tray only if real selected rows exist.

Planner row grammar:

1. row-kind badge: **Planner** or existing equivalent;
2. title, max two lines;
3. receipt line: state + exposure + latest real planning step;
4. one CTA: **View details**, **Preview selected**, **Review selected**, **Remove**, or **Back to offers**;
5. overflow.

Mini tray may show **N selected · Max $X · Compare / Review selected** only when count and exposure are derivable. It is private planning, never checkout, payment, hold, or bulk authorization.

### 6. Track rendered gate — `/pledges` or `/commitments`

**Task:** Track.
**Gate:** authoritative private row, empty receipt lane, auth SafeState, or unavailable SafeState.
**Taobao order-center shape:** lifecycle rows, not dashboards.

At 390px width:

1. owner strip: **Track — commitments, drafts, and issues.**;
2. one compact tabs row **All / Active / Waiting / Action needed / Done / Issues** only if backed;
3. first row or SafeState;
4. row CTA;
5. no duplicate message/account shortcut state.

Track row grammar:

1. row-kind badge: **Draft**, **Reviewing**, **Commitment**, **Issue**, **Done**, or stricter backed equivalent;
2. title, max two lines;
3. receipt line: state + exposure + latest real step;
4. one CTA: **View commitment**, **Review current terms**, **Fix requirements**, **Submit for review**, **Contact support**, or **Back to offers**;
5. overflow.

No fake commitments, receipts, pending holds, reviewer queue, ETA, support case, or duplicate row state in Account/Messages/Profile.

### 7. Account/Profile rendered gate

**Task:** Account.
**Gate:** account header plus backed shortcuts, auth SafeState, or safe empty state.
**Taobao shape:** account shortcuts route to authoritative rows; they do not own state.

At 390px width:

1. account/auth header;
2. owner strip: **Account — saved settings and records.**;
3. Support/Settings shortcuts only if route-safe;
4. compact shortcut grid only for backed route owners: Saved, Recent, Drafts, Receipts, Plan, Messages, Payment methods, Support;
5. first authoritative row summary or SafeState;
6. preferences below.

Shortcut tiles show labels and destinations. They do not show independent counts, statuses, exposure, CTAs, membership ranks, coins, coupons, balances, perks, follower counts, or public popularity unless the same owner row adapter backs them.

### 8. Create rendered gate

**Task:** Create.
**Gate:** Create Entry Sheet or SafeState.
**Taobao shape:** controlled fork before form.

Bottom-nav **Create** opens a sheet before any form. At 390px width, rows are exactly:

1. **Create offer draft** — badge **Draft** or **Unavailable**; outcome **Draft saved. No commitment created.** only if backed; CTA **Save draft** or SafeState.
2. **Create from template** — badge **Template**; outcome **Template opened. No commitment created.**; CTA **Create from template** or **View templates**.
3. **Preview public-goods round** — badge **Preview**; outcome **No commitment was created.**; CTA **Preview budget** or SafeState.
4. **Request review** — badge **Reviewing** or **Unavailable**; outcome **Submitted for review. No live commitment created.** only if backed; CTA **Submit for review** or SafeState.

No raw `/offers/new` form appears first. No publish/live CTA appears without review/backend support and current revalidation.

### 9. Auxiliary rendered gates

Auxiliary UI is a comprehension/support layer, not a route system.

| Auxiliary class | Contains | Exact UX/UI | CTA | Omit / simplify |
|---|---|---|---|---|
| **Guide** | Guide tab/chip, guide filtered list, guide disclosure | One **Guides** tab or compact guide chip row. Guide detail: **Guides use rules, not popularity** → source chips → receipt-card list → **Why this guide?**. | **View guide**; item CTA remains item receipt CTA. | Omit if rule cannot be computed/disclosed. No stars, reviews, popularity, or authority claims. |
| **Explain** | Requirements, rules, verification, funding, eligibility, privacy, timeline, mechanism facts, DealScout where present | One collapsed row: **Requirements & rules**, **Why shown?**, **Verification & funding**, or stricter existing equivalent. Opens inline or one sheet. DealScout uses visible/backed display models only. | **View requirements**, **View rules**, **Back**, **View rule details**. | Omit if it repeats receipt lines or needs a second primary CTA. DealScout cannot negotiate, discover contacts, auto-select, or auto-commit. |
| **Support** | Placement issue, support, report, recovery | Fixed reason chips → optional private note → visibility row → backed support row or SafeState. | **Contact support** / **Submit issue** only when backed. | No public complaint, rating, ranking change, chat, fake support code, or fake progress. |
| **none** | No auxiliary content | No row. | n/a | Default when auxiliary would crowd the first object. |

### 10. Direct-route SafeState rendered gate

**Task:** Safe.
**Gate:** SafeState or safe redirect.

Unsupported route, stale ID, auth gate, not-connected feature, missing object, or unavailable item renders:

1. short title;
2. one-sentence reason;
3. optional receipt fragment: **Preview only · No commitment**, **Unavailable · Terms changed**, **Not connected yet**, or **Sign in required**;
4. one recovery CTA;
5. one optional secondary link.

Controlled examples:

* **No live offers yet. Showing examples and templates.** → **View templates** or **Browse offers**.
* **Create offset is not live yet. View templates or go back to offers.** → **View templates** / **Back to offers**.
* **Planner is empty. Add items to compare before committing.** → **Browse offers**.
* **No lifecycle messages yet.** → **Back to offers**.
* **No compatible recommendations yet. Browse offers or adjust filters.** → **Browse offers**.
* **Payment is not connected yet.** → **Set up later** or **Back to offers**.
* **Support intake is not connected yet.** → **Back to offers** or **Contact support** only if backed.

No raw provider errors, Supabase errors, Stripe errors, stack traces, feature flags, queue IDs, internal enums, or multiple competing CTAs.

## v71 bottom navigation

Use task names and route-safe targets only.

Default 390px bottom nav:

1. **Browse** — `/offers` or `/`.
2. **Plan** — planner/cart only if backed/local/route-safe; otherwise omit or replace with **Guides** only if guide route is useful and backed.
3. **Create** — opens Create Entry Sheet.
4. **Track** — commitments/pledges and lifecycle rows.
5. **Account** — Profile/My.

Rules:

* **Messages** lives under Track or Account unless a real lifecycle inbox is more useful than Plan/Guides and route-safe.
* **Matches/DealScout** lives under Browse or Plan, not bottom nav by default.
* Payment, receipts, evidence, admin, token, relay, queue, refund, support, and notification pages do not become bottom-nav targets in Release A solely because they are named in older specs.
* If a nav target cannot pass a rendered acceptance gate or SafeState, omit it.

## v71 deletion and stop rules

When a route is verbose or conflicted, delete/demote in this order:

1. old hero/methodology/theory blocks;
2. second banner, promotion-like strip, decorative notice, and large illustration;
3. quick-action strip, spotlight lane, duplicate guide row, DealScout row;
4. account/cart/message/Profile widget on public Browse;
5. duplicate status, terms, role, mechanism, funding, eligibility, evidence, privacy, or support card;
6. second auxiliary class;
7. secondary CTA;
8. chips beyond two visible chips;
9. long mechanism prose, calculations, FAQ, rule text, and caveats;
10. decorative or unbacked media;
11. only then tighten spacing within accessibility and touch-target limits.

Never delete or hide source state, status, maximum exposure, obligation, charge/release/no-charge rule, eligibility blocker, privacy/visibility fact where decision-critical, row kind, or primary CTA.

Implementation stop rule:

1. Pass Browse current-state gate.
2. Pass first card → detail → sheet/SafeState handoff.
3. Pass direct-route SafeState gate.
4. Pass Plan/Track current-state gate.
5. Pass Account/Create current-state gate.
6. Only then consider optional live/personalized/support/guide/DealScout variants that are backed.

An older primitive is active only if it appears inside a v71 rendered gate as one of:

* receipt line;
* the single auxiliary class;
* collapsed below-fold expander;
* SafeState reason;
* proof check.

Otherwise it is future work not attempted.

## v71 proof requirement

Use one six-row rendered acceptance proof table unless the repository already has a stricter convention.

| Proof row | Required proof fields |
|---|---|
| **Browse** | route, verified current scenario, first-render gate result, first object receipt lines and source owners, first 390px shelf order, combined rail behavior, first card/empty SafeState, auxiliary class, omitted modules, bottom nav, evidence, pass/fail |
| **Detail/Sheet** | object key/source owner, same receipt lines on card/detail/footer/sheet, CTA handoff state, sheet scenario, revalidation/checking copy, result placement/copy, owner row or non-durable result, auxiliary class, evidence, pass/fail |
| **Plan** | planner backing/local owner or SafeState, first row receipt, selected count/exposure derivation, mini tray behavior, no checkout/live state from private selection, evidence, pass/fail |
| **Track** | authoritative row owner, first row/SafeState receipt, lifecycle state source, invalid-row treatment, row CTA, no duplicate Account/Messages/Profile state, evidence, pass/fail |
| **Account/Create** | Account shortcut ownership, Create Entry Sheet option receipts, draft/template/review successor row or SafeState, no raw form first, no fake shortcut counts, evidence, pass/fail |
| **Direct-route safety** | first-render gate result, SafeState title/reason/recovery CTA, auth return if relevant, no raw errors, no partial route shells, no fake support/durable state, evidence, pass/fail |

Completion cannot be claimed from type definitions, component exports, matching screenshots, or prose. Completion requires route evidence: rendered-route checks, DOM checks, screenshots with state/selector context, page-object actions, Storybook interactions, tests, or a documented stricter equivalent.

## v71 non-negotiable additions

* Treat this v71 file as the active implementation target.
* Do not use v55-v70 as an active backlog.
* Do not add runtime framework files merely to satisfy `RouteAcceptanceGateV71`.
* Do not render route-specific UI before the First-Render Gate resolves receipt object, empty lane, auth SafeState, not-connected SafeState, unavailable SafeState, or safe redirect.
* Do not let Browse show more than search, one tab row, one context line, one combined control rail, and the first card/empty state before bottom nav at 390px.
* Do not let non-Browse routes show guide, DealScout, disclosure, support, funding, eligibility, account widgets, cart widgets, message widgets, or mechanism facts above the receipt-bearing object.
* Do not allow more than one auxiliary class above the fold; default to none.
* Do not render a public card, detail, sheet, private row, result, or SafeState without adjacent visible receipt lines or a clear SafeState reason.
* Do not allow receipt-like summaries on the same first screen to disagree.
* Do not let card → detail → sheet CTA strengthen without backed revalidation and visible reason.
* Do not show a live/review/support/order/payment CTA unless the receipt, selected release, backend mutation, row owner, and current revalidation all allow it.
* Do not show a successor row link unless the row exists and derives from the same object key or declared successor key.
* Do not use generic **Success**, **Joined**, **Order placed**, **Reserved**, **Claimed**, **Hot**, **Best**, **Popular**, or **People like you** copy.
* Do not make zero-live mode look live.
* Do not duplicate private row state across Plan, Track, Account, Messages, Profile, and toast/result surfaces.
* Do not solve first-screen density by hiding source/status/exposure/obligation/payment/evidence/privacy/eligibility/CTA facts, using color-only state, relying on hover/tooltips, or shrinking text below accessibility limits.
* Do not claim v71 completion without six rendered acceptance proof rows or a stricter existing route-evidence convention.
