# Moral Trade Offers Redesign Report

## Executive summary

The current `moraltrade.org/offers` page has a serious product-positioning problem before it has a styling problem: it presents itself as a browsable marketplace, but the directory currently reports **0 listings**, exposes many **zero-count filters**, and then asks users to browse worked examples or create the first offer instead. The result is a page that combines marketplace controls, pilot disclaimers, methodology language, and empty-state messaging in a way that feels structurally unresolved rather than intentionally minimalist. The most load-bearing issues are the jargon-heavy hero (“Browse the narrow pilot wedge”), the mismatch between search/filter affordances and live inventory, the interruption of the browse flow by a large footer/trust block before the detailed filter module, and the lack of a professional, consistent card and page-detail system. citeturn16view0turn13view0turn15view0

The two reference sites solve adjacent problems in more professional ways. Giving What We Can organizes a large decision space using clear cause-area segmentation, concise donation cards, repeated “Donate / Info” actions, vetted-recommendation framing, an allocation sidebar, donor-advice CTAs, and hard trust signals such as legal registration details. eBay solves large-scale browse complexity with a universally recognizable search bar, category mega-navigation, advanced search, strong merchandising hierarchy, and explicit trust programs such as Authenticity Guarantee, Refurbished, and Secure Purchase. Moral Trade should borrow **GWWC’s clarity and evidence framing** and **eBay’s browse/search architecture**, while avoiding eBay’s visual density and avoiding GWWC’s nonprofit-specific assumptions. citeturn8view0turn17view0turn18view0turn18view1turn19view0

The highest-value redesign path is straightforward. First, rebuild the page as a professional **collection page** with a plain-language headline, a differentiated **Live offers / Worked examples** tab model, a proper search-and-filter toolbar, and a canonical card layout. Second, move trust, safety, and evidence language into a compact right rail or expandable module instead of scattering it across the browse flow. Third, create stable detail pages and structured metadata so the page is legible to users, assistive technology, and search engines. Fourth, instrument the page with field performance and behavioral analytics so design decisions can be driven by actual user behavior rather than theory. citeturn16view0turn15view2turn28view0turn32view3

Overall confidence is **high** for information-architecture, content-hierarchy, trust-signal, and reference-pattern findings because those are directly visible in the live page text and navigation. Confidence is **medium** for visual-design and mobile-responsiveness findings because the available browsing environment exposed DOM/text content rather than browser-rendered screenshots or device emulation. Confidence is **medium** for metadata/performance findings because title/title-like text, render behavior, and SEO affordances were inspectable, but raw `<head>` source, Core Web Vitals field data, and exact breakpoint rendering were not directly available in this environment. citeturn16view0turn28view0turn32view4

## Live audit of the current offers page

The page currently starts with a global browse/create/learn/community navigation shell, then a breadcrumb, then the H1 “Browse the narrow pilot wedge,” then three contextual CTAs, then launch-scope explanatory copy, then a compact in-line browse row containing tabs, search, cause filters, sort controls, and a second “Search” label. After “Popular filters,” the page inserts a long site-level trust/footer block before the detailed filters UI, and only then shows the directory empty state, which announces “0 listings,” “No live offers yet,” and pushes visitors toward worked examples or trade creation. Below that are worked-example cards and an additional “Pilot mode / Illustrative fit ranking” strip that repeats examples by cause. citeturn16view0

This means the page is doing three different jobs at once: explaining the pilot, presenting a browse tool, and acting as a trust/learn hub. The references separate these jobs more cleanly. GWWC presents a donation collection page with clear sections, repeated card anatomy, and trust/context modules placed below or beside the core listing experience. eBay makes search and category access obvious before users enter deeper browse flows. Moral Trade should make the browse job primary and subordinate the rest. citeturn8view0turn17view0turn18view0

| Audit area | What is live now | Why it matters | Severity | Confidence |
|---|---|---|---|---|
| Structure | The page mixes global nav, hero, pilot explanation, quick filters, a footer-style trust block, a detailed filter module, an empty directory, worked examples, and a second pilot/example strip on one page. citeturn16view0 | The browse path is interrupted and the page lacks a single dominant task flow. | High | High |
| Content hierarchy | The H1 is “Browse the narrow pilot wedge,” followed by language about verified offsets, public goods, bounded pledges, and deferred paid actions. citeturn16view0 | The language is insider-facing and concept-heavy rather than plain-language browse copy. | High | High |
| Inventory signaling | The page reports `0 listings`, exposes numerous `(0)` filters, shows “No live offers yet,” and then directs users to worked examples or creation. citeturn16view0 | A marketplace with a large browse surface but zero live inventory creates friction and low trust. | High | High |
| Visual design | The DOM shows dense, highly compressed filter/search/sort text in a single line, many CTA variants, and repeated example modules. citeturn16view0 | Even without pixel rendering, the information density and repetition strongly imply weak visual grouping. | High | Medium |
| Taxonomy | The page uses cause labels such as Global poverty, Animal welfare, Climate, Existential risk, Future flourishing, and Public health, while other Moral Trade pages and hero snippets also use Global health and other adjacent labels. citeturn16view0turn3search6 | Taxonomy drift makes filtering, comprehension, and future analytics harder. | Medium | High |
| Accessibility | Controls are conceptually dense; labels and headings are not consistently plain-language; filter and status changes are not obviously announced; the control density raises reflow and target-size concerns for narrow screens. WCAG 2.2 requires descriptive headings/labels, labels or instructions for inputs, programmatically determinable name/role/value, status messages announced without focus, no two-dimensional scroll at 320 CSS px, and minimum 24 × 24 CSS px targets. citeturn16view0turn37view2turn37view4turn40view2turn43view2turn37view0turn39view1 | Accessibility problems here would directly affect search, filtering, and card browsing. | High | Medium |
| Trust placement | Safety, reasoning standards, and methodology content exist on the site and are substantive, but they are not distilled into compact, in-context trust signals on the primary browse surface. citeturn15view0turn15view2turn13view0 | The content exists, but its current placement weakens conversion and scanability. | High | High |
| Metadata | A page title is present as “Browse moral trade offers | Moral Trade.” Raw meta description, canonical tag, Open Graph/Twitter cards, and JSON-LD were not directly inspectable in this environment. citeturn1view0 | The title is directionally fine, but the rest of the metadata stack needs explicit verification and likely expansion. | Medium | Medium |
| SEO/rendering | The crawlable page output includes “Loading Moral Trade” and “Opening the requested workflow,” which is consistent with a JavaScript-driven route or hydration shell. Google recommends unique titles/meta descriptions for JS pages and meaningful HTTP status codes to avoid soft-404 behavior in SPAs. citeturn16view0turn32view2 | If the route is JS-heavy without careful SSR/prerender, indexation and previews can degrade. | High | Medium |
| Performance | No Core Web Vitals scores were directly measured here, but the visible loading shell and likely JS route behavior are warning signs. web.dev defines good thresholds as LCP ≤ 2.5s, INP ≤ 200 ms, and CLS ≤ 0.1 at the 75th percentile. citeturn16view0turn28view1turn28view2turn28view3 | The page needs measurement plus likely reduction in JS and layout instability. | Medium | Medium |
| Mobile responsiveness | Raw device rendering was not available in this environment. Still, WCAG reflow requires usable presentation at 320 CSS px without two-dimensional scrolling, and the current dense inline controls and many small chips create obvious risk. citeturn16view0turn37view0turn39view1 | Mobile browse quality is likely fragile unless the page is rebuilt responsively. | High | Medium |

Two specific observations deserve emphasis. First, surfacing a detailed filter panel full of zero-count options on a page with no live offers is the wrong default. Second, the current page’s best content is arguably the worked examples, yet they are not treated as the main product. Until live inventory exists, the page should default to an editorial/curated experience, not an empty marketplace. That judgment follows directly from the current state of the page and from the way GWWC and eBay align their primary interface with the actual state of their inventory. citeturn16view0turn8view0turn19view0

## Reference pattern comparison

Giving What We Can is the stronger benchmark for **clarity, curation, and trust framing**. eBay is the stronger benchmark for **search, navigation, faceting, and browse scale**. The redesign should deliberately combine those strengths rather than imitate either site literally. citeturn8view0turn17view0turn18view0turn18view1

| Pattern | Moral Trade current | Giving What We Can pattern | eBay pattern | What Moral Trade should adopt | Evidence |
|---|---|---|---|---|---|
| Hero framing | Insider-facing H1 and pilot-scope explanation. citeturn16view0 | Plain H1: “Donation platform” with a simple supporting sentence. citeturn8view0 | Clear commerce-first title and universal search at top. citeturn18view0 | Replace philosophy-heavy hero with plain-language browse framing plus counts and one primary CTA. | citeturn16view0turn8view0turn18view0 |
| Information architecture | Browse, learn, safety, and pilot explanation are interleaved. citeturn16view0 | Recommendation sections are grouped by purpose and cause area. citeturn8view0turn8view2 | Categories are explicitly hierarchical and discoverable. citeturn18view0turn18view2 | Use a top-level split between collection browsing and supporting trust/education. | citeturn16view0turn8view2turn18view2 |
| Navigation | Global site nav is present, but browse-specific actions are not dominant. citeturn16view0 | Mega-nav plus focused donation-page content. citeturn8view0 | Search-first header, category access, advanced search, my activity, saved searches. citeturn18view0 | Add a browse-specific toolbar: search, tabs, sort, view toggle, saved interest. | citeturn16view0turn18view0 |
| Calls to action | CTA labels vary: Create verified offset, Sign in to participate, View worked examples, Create trade, Create similar trade. citeturn16view0 | Consistent “Donate / Info” at card level and clear advisory CTA. citeturn8view0turn17view0 | Clear action language like Shop now, Learn more, Bid now, Do your thing. citeturn18view1turn19view0 | Standardize to one primary browse CTA, one secondary engagement CTA, and one card-level primary CTA. | citeturn16view0turn17view0turn19view0 |
| Inventory treatment | Empty live directory with worked examples below. citeturn16view0 | Curated recommendations first; no false impression of unbounded live inventory. citeturn8view0turn8view2 | Large inventory-first flows only where inventory exists. citeturn19view0 | Default to curated examples until there is real live supply. | citeturn16view0turn8view0turn19view0 |
| Taxonomy | Cause areas and formats exist, but labels feel expert-oriented and counts are mostly zero. citeturn16view0 | Clear cause sections with recommendation counts. citeturn8view0turn8view2 | Strong category trees and secondary category paths. citeturn18view0turn18view2 | Keep causes and formats, but simplify naming and separate them cleanly. | citeturn16view0turn8view2turn18view2 |

| Pattern | Moral Trade current | Giving What We Can pattern | eBay pattern | What Moral Trade should adopt | Evidence |
|---|---|---|---|---|---|
| Listing card anatomy | Worked-example cards include format, duration, evidence, score, threshold, and manual-review copy, but the system is not clearly normalized and sits below an empty directory. citeturn16view0 | Cards consistently show image, organization, program, description, and `Donate / Info`. citeturn8view0turn8view2 | Deal/listing cards expose image, price/value, state, and CTA in highly scannable form. citeturn19view0 | Create a normalized card skeleton with title, type, cause, offered action, requested action, evidence, review state, and primary CTA. | citeturn16view0turn8view2turn19view0 |
| Filtering and sorting | Search/cause/sort controls are compressed inline; detailed filters appear later; many options show zero counts. citeturn16view0 | Primarily categorical segmentation rather than deep faceting. citeturn8view0turn8view2 | Deep browse tooling with advanced search, category drill-down, and saved searches. citeturn18view0 | Use eBay-style persistent search/filter mechanics, but hide empty facets and keep defaults simple. | citeturn16view0turn18view0 |
| Trust signals | Trust material is present across Safety, Methodology, and Reasoning Standards pages, but not efficiently surfaced in the main list/cards. citeturn15view0turn15view2turn13view0 | Research-vetted language, donor advice CTA, legal registration data, and organization identity are visible. citeturn8view0turn17view0 | Authenticity Guarantee, Refurbished, Secure Purchase, legal/privacy footer. citeturn10view5turn18view1turn18view0 | Put review state, evidence method, no-escrow statement, and safety boundaries directly on cards and detail pages. | citeturn15view0turn15view2turn17view0turn18view1 |
| Empty-state strategy | “No live offers yet” plus create/start alternatives. citeturn16view0 | Curated funds and “Can’t decide?” sections help users proceed. citeturn8view2 | Deals, categories, and guides keep users moving even if they don’t know what to search yet. citeturn18view1turn19view0 | Make the empty state a guided next-step module: featured examples, explanation, waitlist/save alert, and create-offer entry. | citeturn16view0turn8view2turn19view0 |
| Conversion support | Sign-in and creation CTAs exist, but there is no polished “save interest / compare / follow” flow. citeturn16view0 | Selection tray and donor advising help users move toward action. citeturn17view0 | Saved searches, watchlist, bids/offers, saved sellers. citeturn18view0 | Add lightweight logged-out capture: save search, follow cause, notify when live offer appears. | citeturn16view0turn17view0turn18view0 |

The strategic takeaway is simple: **GWWC makes hard choices feel credible; eBay makes large lists feel controllable**. Moral Trade needs both. citeturn8view0turn18view0

## Redesign blueprint for Codex 5.5 xHigh

The redesign should be executed as a **collection-page rebuild**, not as incremental decoration over the current page. The page needs a new shell, a stable information hierarchy, and a data-driven listing system. The wireframe below shows the recommended page architecture.

```mermaid
flowchart TB
    A[Global Header<br/>Logo | Browse | Learn | Sign in | Create offer] --> B[Collection Header<br/>Browse offers | Live count | Worked examples count]
    B --> C[Primary CTAs<br/>Create offer | Save search]
    B --> D[Tabs<br/>Live offers | Worked examples]
    D --> E[Browse Toolbar<br/>Search | Cause | Format | Review state | Sort | View toggle]
    E --> F[Content Area]
    F --> G[Sticky Filter Rail<br/>Progressive facets]
    F --> H[Results Grid<br/>Offer cards]
    F --> I[Trust Rail<br/>How it works | Evidence | Safety | No escrow]
    H --> J[Offer Detail Page]
    J --> K[Actions<br/>Save | Create similar | Contact after sign-in]
```

That structure is consistent with the current Moral Trade data model emphasis on explicit terms, evidence rules, review states, and staged participation; with GWWC’s collection-page clarity; and with eBay’s persistent browse controls. citeturn13view0turn15view2turn8view0turn18view0

### High-priority recommendations

#### Rebuild the page shell and rewrite the top of the page

**Codex instruction:** replace the current hero and top-of-page sequence with a plain-language collection header.

Use these content rules:

- H1: `Browse offers`
- Subhead: one sentence explaining what users can do in direct, non-jargon language.
- Show two counts near the H1: `Live offers` and `Worked examples`.
- Use one primary CTA: `Create an offer`
- Use one secondary CTA: `Save search`
- Move the “narrow pilot wedge” and deferred-paid-action explanation into an expandable “About this pilot” disclosure.

This aligns with WCAG’s requirement that headings and labels describe topic or purpose, and it matches the clearer top-level framing seen on the reference sites. citeturn37view2turn8view0turn18view0

Suggested markup:

```html
<header class="collection-header">
  <nav aria-label="Breadcrumb">
    <ol class="breadcrumbs">
      <li><a href="/">Home</a></li>
      <li aria-current="page">Browse offers</li>
    </ol>
  </nav>

  <div class="collection-header__body">
    <div>
      <p class="eyebrow">Marketplace</p>
      <h1>Browse offers</h1>
      <p class="lede">
        Explore live offers and reviewed examples by cause area, format,
        evidence method, and review state.
      </p>
      <div class="stats" aria-label="Marketplace counts">
        <span><strong id="live-count">0</strong> live offers</span>
        <span><strong id="example-count">3</strong> worked examples</span>
      </div>
    </div>

    <div class="header-actions">
      <a class="btn btn-primary" href="/create">Create an offer</a>
      <button class="btn btn-secondary" type="button">Save search</button>
    </div>
  </div>

  <details class="pilot-note">
    <summary>About this pilot</summary>
    <p>
      Paid action offers remain deferred while identity, dispute, and compliance
      workflows mature.
    </p>
  </details>
</header>
```

#### Make the page tabbed, and default intelligently

**Codex instruction:** introduce two top-level tabs, `Live offers` and `Worked examples`.

Behavioral rule:

- If `liveOfferCount === 0`, default to `Worked examples`.
- If `liveOfferCount > 0`, default to `Live offers`.
- Preserve the selected tab in the URL querystring.
- Show the inactive tab’s count.

This reduces the current contradiction between browse affordances and available inventory. It also mirrors GWWC’s tactic of foregrounding the most useful curated content rather than presenting a dead-end empty list. citeturn16view0turn8view0turn8view2

Suggested state model:

```js
const params = new URLSearchParams(location.search);
const liveOfferCount = window.__BOOTSTRAP__.counts.live;
const defaultTab = liveOfferCount > 0 ? "live" : "examples";
const activeTab = params.get("tab") || defaultTab;

function setTab(tab) {
  params.set("tab", tab);
  history.replaceState({}, "", `${location.pathname}?${params.toString()}`);
  renderCollection({ ...state, tab });
}
```

#### Replace the compressed inline browse row with a professional toolbar and sticky facet rail

**Codex instruction:** split search/sort from advanced filters.

The top toolbar should hold:

- search field
- cause selector
- format selector
- review-state selector
- sort menu
- grid/list toggle
- result count

The left rail should hold advanced facets only:

- duration
- evidence method
- match state
- offered-impact score
- requested-impact threshold
- participant type
- hide zero-result facets

For accessibility, the advanced filters should use the WAI-ARIA accordion pattern only if they collapse; accordion headers should be buttons wrapped by headings, with `aria-expanded`, `aria-controls`, and proper keyboard support. Inputs need visible labels or instructions, programmatically determinable names/roles/values, and facet/result updates should be announced as status messages without stealing focus. citeturn27view0turn37view4turn40view1turn43view2

Suggested accessible filter shell:

```html
<section class="browse-toolbar" aria-label="Browse toolbar">
  <label class="search">
    <span class="sr-only">Search offers</span>
    <input
      type="search"
      id="q"
      name="q"
      placeholder="Search offers, actions, or cause areas"
      autocomplete="off"
    />
  </label>

  <label>
    <span>Cause</span>
    <select name="cause">
      <option value="">All causes</option>
      <option value="global-poverty">Global poverty</option>
      <option value="animal-welfare">Animal welfare</option>
      <option value="climate">Climate</option>
      <option value="public-health">Public health</option>
    </select>
  </label>

  <label>
    <span>Format</span>
    <select name="format">
      <option value="">All formats</option>
      <option value="pledge-swap">Pledge swap</option>
      <option value="donation-offset">Donation offset</option>
      <option value="public-good">Public-good contribution</option>
    </select>
  </label>

  <label>
    <span>Sort</span>
    <select name="sort">
      <option value="newest">Newest</option>
      <option value="reviewed">Most reviewed</option>
      <option value="highest-offered-impact">Highest offered impact</option>
      <option value="best-fit">Best fit</option>
    </select>
  </label>

  <p id="results-count" aria-live="polite">3 results</p>
</section>

<aside class="filters" aria-labelledby="filters-heading">
  <h2 id="filters-heading">Filters</h2>

  <h3>
    <button
      type="button"
      class="accordion-trigger"
      aria-expanded="true"
      aria-controls="filter-evidence"
      id="filter-evidence-trigger">
      Evidence method
    </button>
  </h3>
  <div id="filter-evidence" role="region" aria-labelledby="filter-evidence-trigger">
    <label><input type="checkbox" name="evidence" value="annual-receipts"> Annual receipts</label>
    <label><input type="checkbox" name="evidence" value="public-pledge"> Public pledge</label>
    <label><input type="checkbox" name="evidence" value="manual-review"> Manual review required</label>
  </div>
</aside>
```

#### Normalize listing cards and create canonical detail pages

**Codex instruction:** every card should follow the same anatomy and every public item should have a canonical detail page.

Recommended card anatomy:

1. status badge row
2. format + cause pairing
3. short title
4. one-line summary
5. offered action
6. requested action
7. evidence / duration / review metadata
8. confidence or fit disclaimer where relevant
9. primary CTA: `View details`
10. secondary CTA: `Create similar`

This is the single biggest UI step needed to make the page feel like a real product rather than a pilot document. It follows the repeatable card logic that both reference sites use. citeturn16view0turn8view0turn8view2turn19view0

Suggested card markup:

```html
<article class="offer-card">
  <header class="offer-card__header">
    <ul class="badges" aria-label="Offer status">
      <li><span class="badge badge-neutral">Worked example</span></li>
      <li><span class="badge badge-info">Manual review required</span></li>
    </ul>
    <p class="meta">Personal pledge swap · Global poverty ↔ Animal welfare</p>
    <h3>
      <a href="/offers/victoria-global-poverty-animal-welfare">
        Victoria: Global poverty for animal welfare
      </a>
    </h3>
    <p class="summary">
      A receipt-backed 12‑month pledge swap with explicit evidence and review rules.
    </p>
  </header>

  <dl class="offer-card__terms">
    <div>
      <dt>Offered action</dt>
      <dd>Donate 1% of income to an evidence-backed poverty charity for 12 months.</dd>
    </div>
    <div>
      <dt>Requested action</dt>
      <dd>Adopt a vegetarian diet for 12 months.</dd>
    </div>
  </dl>

  <ul class="offer-card__facts" aria-label="Offer details">
    <li>Duration: 12 months</li>
    <li>Evidence: Annual receipts</li>
    <li>Offered score: 7</li>
    <li>Requested threshold: 8</li>
  </ul>

  <footer class="offer-card__footer">
    <a class="btn btn-primary" href="/offers/victoria-global-poverty-animal-welfare">View details</a>
    <a class="btn btn-secondary" href="/create?from=victoria-global-poverty-animal-welfare">Create similar</a>
  </footer>
</article>
```

#### Surface trust signals inside the browse flow

**Codex instruction:** convert existing trust content into compact browse-aware modules.

Place a right rail or sticky summary box containing:

- `Voluntary only`
- `Evidence-gated`
- `Manual review where stated`
- `No escrow or custody`
- `Safety boundaries`
- links to methodology, safety, validation rules

These claims are already core to Moral Trade’s public language; they just need to be surfaced where people evaluate listings. The site’s methodology, safety, and reasoning standards pages already define these principles clearly. citeturn13view0turn15view0turn15view2

Suggested compact module:

```html
<aside class="trust-panel" aria-labelledby="trust-heading">
  <h2 id="trust-heading">Before you rely on a listing</h2>
  <ul>
    <li>Voluntary terms only</li>
    <li>Evidence must be named before reliance</li>
    <li>Review states are shown on every card</li>
    <li>No escrow, custody, legal, or tax service</li>
  </ul>
  <p class="trust-links">
    <a href="/methodology">Methodology</a>
    <a href="/reasoning-standards">Evidence standards</a>
    <a href="/safety">Safety policy</a>
  </p>
</aside>
```

#### Do the accessibility rebuild at the same time, not later

**Codex instruction:** treat accessibility as part of the primary rebuild, not a polish pass.

Non-negotiable acceptance criteria:

- headings/labels describe topic or purpose
- search and filter inputs have visible labels or instructions
- custom controls expose name, role, value
- result-count changes are announced through an `aria-live="polite"` or equivalent status role
- focus styles are obvious
- text contrast meets at least 4.5:1
- chip/filter targets meet at least 24 × 24 CSS px
- mobile layouts reflow without two-dimensional scrolling at 320 CSS px
- if any filter grouping is collapsible, it follows APG accordion semantics and keyboard interaction

These are direct consequences of WCAG 2.2 and WAI-ARIA APG. citeturn37view2turn37view4turn40view1turn43view2turn38view1turn39view1turn37view0turn27view0

Suggested CSS baseline:

```css
:root {
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --radius: 12px;
  --border: 1px solid #d9dde3;
}

button,
a.btn,
input,
select {
  min-height: 44px; /* comfortably exceeds WCAG 2.5.8 minimum */
}

:focus-visible {
  outline: 3px solid #1f6feb;
  outline-offset: 2px;
}

.results-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 280px;
  gap: var(--space-6);
}

@media (max-width: 960px) {
  .results-layout {
    grid-template-columns: 1fr;
  }
}

.offer-card {
  border: var(--border);
  border-radius: var(--radius);
  padding: var(--space-4);
}
```

### Medium-priority recommendations

#### Add saved searches, “follow cause,” and compare mode

This is where eBay is especially useful as a pattern source. Saved searches, saved sellers, and watchlists reduce revisit friction and make browse pages useful even when the user is not ready to transact immediately. For Moral Trade, the analogous objects are **saved search**, **follow cause area**, and **notify me when a live offer appears**. citeturn18view0

Implementation sketch:

```js
POST /api/saved-searches
{
  "query": "vegetarian receipts",
  "cause": "animal-welfare",
  "format": "pledge-swap",
  "reviewState": "manual-review"
}
```

#### Create editorial collection modules above the grid

Until live inventory becomes meaningful, the page should have optional editorial modules:

- `Featured worked examples`
- `Best first examples by format`
- `Newly reviewed examples`
- `Browse by cause area`

This mirrors GWWC’s curated recommendations and eBay’s discovery blocks, while remaining truthfully aligned with current supply. citeturn8view0turn8view2turn18view1turn19view0

#### Add result-state logic so empty filters never feel broken

Rules:

- hide zero-result facet groups by default
- when filters collapse results to zero, show reset chips and three guided alternatives
- when global inventory is zero, do not present deep browse controls as the dominant page experience

This is product logic more than visual design, but it is one of the highest perceived-quality improvements.

### Low-priority recommendations

#### Add personalization and marketplace memory

After the page is structurally sound, add:

- recently viewed offers
- recommended examples by cause preference
- “create from template” shortcuts from viewed cards
- profile-based browse presets after sign-in

These are useful only after the basic architecture, taxonomy, and analytics are in place.

## Data, API, and SEO specification

### Recommended internal data model

The current public pages already imply a structured offer model: cause area, action, requested counterpart, verification method, duration, payment cadence if relevant, exit conditions, review state, and safety boundaries. That should be implemented as an explicit normalized domain model rather than loosely formatted rich text. citeturn13view0turn15view2

| Entity | Key fields | Notes |
|---|---|---|
| `offers` | `id`, `slug`, `title`, `summary`, `format`, `status`, `visibility`, `is_worked_example`, `review_state`, `created_at`, `updated_at`, `published_at`, `expires_at`, `canonical_url` | Core listing record |
| `offer_terms` | `offer_id`, `offered_action`, `requested_action`, `duration_value`, `duration_unit`, `exit_rule`, `payment_mode`, `payment_cadence`, `match_state` | Terms users actually browse |
| `offer_taxonomy` | `offer_id`, `primary_cause`, `secondary_cause`, `tags[]`, `participant_type` | Keep cause taxonomy normalized |
| `offer_evidence` | `offer_id`, `verification_method`, `verification_summary`, `requires_manual_review`, `evidence_examples[]` | Evidence display layer |
| `offer_scores` | `offer_id`, `offered_impact_score`, `requested_impact_threshold`, `score_explainer` | Explicitly flagged as internal estimate where relevant |
| `offer_parties` | `offer_id`, `display_name`, `profile_slug`, `is_public_profile` | Can support private-mode/pseudonymous presentation |
| `offer_moderation_events` | `offer_id`, `event_type`, `actor`, `notes`, `created_at` | Audit trail for review states |
| `saved_searches` | `user_id`, `query`, `filters_json`, `notify_on_live_match` | Supports follow/alert product needs |
| `offer_collections` | `id`, `slug`, `name`, `description`, `rules_json` | Featured modules, cause collections, onboarding collections |

A practical JSON schema for a public listing payload:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PublicOffer",
  "type": "object",
  "required": [
    "id",
    "slug",
    "title",
    "format",
    "status",
    "isWorkedExample",
    "reviewState",
    "primaryCause",
    "offeredAction",
    "requestedAction",
    "verificationMethod",
    "duration",
    "canonicalUrl"
  ],
  "properties": {
    "id": { "type": "string" },
    "slug": { "type": "string" },
    "title": { "type": "string", "maxLength": 140 },
    "summary": { "type": "string", "maxLength": 300 },
    "format": {
      "type": "string",
      "enum": ["pledge-swap", "donation-offset", "public-good", "paid-action"]
    },
    "status": {
      "type": "string",
      "enum": ["draft", "live", "archived", "deferred"]
    },
    "isWorkedExample": { "type": "boolean" },
    "reviewState": {
      "type": "string",
      "enum": ["unreviewed", "manual-review-required", "reviewed", "disputed"]
    },
    "primaryCause": { "type": "string" },
    "secondaryCause": { "type": ["string", "null"] },
    "offeredAction": { "type": "string" },
    "requestedAction": { "type": "string" },
    "verificationMethod": { "type": "string" },
    "verificationSummary": { "type": ["string", "null"] },
    "duration": {
      "type": "object",
      "required": ["value", "unit"],
      "properties": {
        "value": { "type": ["number", "null"] },
        "unit": {
          "type": "string",
          "enum": ["days", "months", "years", "open-ended"]
        }
      }
    },
    "offeredImpactScore": { "type": ["number", "null"], "minimum": 0, "maximum": 10 },
    "requestedImpactThreshold": { "type": ["number", "null"], "minimum": 0, "maximum": 10 },
    "displayName": { "type": "string" },
    "canonicalUrl": { "type": "string", "format": "uri" },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  }
}
```

### Recommended API contract

Use a collection/detail API with URL-state-compatible filters.

```http
GET /api/offers?q=vegetarian&tab=examples&cause=animal-welfare&format=pledge-swap&reviewState=manual-review-required&sort=newest&page=1
```

Example response:

```json
{
  "meta": {
    "tab": "examples",
    "page": 1,
    "pageSize": 24,
    "total": 3,
    "sort": "newest",
    "availableFacets": {
      "cause": [
        { "value": "animal-welfare", "count": 2 },
        { "value": "public-health", "count": 1 }
      ],
      "format": [
        { "value": "pledge-swap", "count": 3 }
      ],
      "verificationMethod": [
        { "value": "annual-receipts", "count": 2 },
        { "value": "public-pledge", "count": 1 }
      ]
    }
  },
  "items": [
    {
      "id": "offer_01",
      "slug": "victoria-global-poverty-animal-welfare",
      "title": "Victoria: Global poverty for animal welfare",
      "summary": "A receipt-backed 12-month pledge swap with explicit evidence and review rules.",
      "format": "pledge-swap",
      "status": "archived",
      "isWorkedExample": true,
      "reviewState": "manual-review-required",
      "primaryCause": "global-poverty",
      "secondaryCause": "animal-welfare",
      "offeredAction": "Donate 1% of my income to an evidence-backed poverty charity for 12 months.",
      "requestedAction": "Adopt a vegetarian diet for 12 months.",
      "verificationMethod": "annual-receipts",
      "duration": { "value": 12, "unit": "months" },
      "offeredImpactScore": 7,
      "requestedImpactThreshold": 8,
      "displayName": "Victoria",
      "canonicalUrl": "https://www.moraltrade.org/offers/victoria-global-poverty-animal-welfare"
    }
  ]
}
```

Recommended supporting endpoints:

```http
GET  /api/offers/:slug
GET  /api/offers/facets
POST /api/saved-searches
POST /api/offers/:id/follow
POST /api/offers/:id/create-similar
```

### SEO, metadata, and structured data spec

Google recommends descriptive, concise page titles; distinct titles per page; non-boilerplate phrasing; meta descriptions/snippet controls where appropriate; canonical URLs for duplicates; and equivalent metadata/structured data on mobile and desktop. Google also recommends JSON-LD for structured data where possible. A sitemap usually helps discovery. citeturn30view3turn30view5turn30view6turn30view1turn32view1turn32view5turn28view6turn32view0

For this page, the key SEO changes are:

- add a stronger `<title>`
- add a specific meta description
- add canonical URLs for collection and detail pages
- keep metadata identical on mobile
- ensure meaningful HTTP status codes if the route is JS-driven
- add sitemap coverage for collection and detail pages
- add supported structured data where appropriate

Suggested metadata:

```html
<title>Browse Moral Trade Offers and Worked Examples | Moral Trade</title>
<meta
  name="description"
  content="Browse live moral trade offers and worked examples by cause area, format, evidence method, and review state."
/>
<link rel="canonical" href="https://www.moraltrade.org/offers" />
<meta property="og:title" content="Browse Moral Trade Offers and Worked Examples" />
<meta
  property="og:description"
  content="Explore live offers and reviewed examples with explicit terms, evidence rules, and safety boundaries."
/>
<meta property="og:type" content="website" />
<meta property="og:url" content="https://www.moraltrade.org/offers" />
<meta name="twitter:card" content="summary_large_image" />
```

For structured data, the safest production choice is:

- sitewide `Organization`
- sitewide `WebSite` with `SearchAction`
- page-level `BreadcrumbList`
- optional semantic `ItemList`/`CollectionPage` markup for internal consistency, without assuming a Google rich result for generic offers

Google Search Central explains that structured data helps Google understand page content and recommends JSON-LD. Google also supports `Organization` and `BreadcrumbList`; schema.org defines `SearchAction`, `ItemList`, `BreadcrumbList`, and `Offer`. For generic Moral Trade listings, do **not** assume Google will award a rich result simply because you publish `Offer` or `ItemList`; Google’s host-carousel support for `ItemList` is limited to specific content types. citeturn28view5turn28view6turn42view0turn42view1turn42view3turn34view4turn34view5turn34view1turn33view0turn42view4turn42view5

Suggested JSON-LD:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Moral Trade",
  "url": "https://www.moraltrade.org",
  "logo": "https://www.moraltrade.org/logo.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "contact@moraltrade.org"
  }
}
</script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "url": "https://www.moraltrade.org",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://www.moraltrade.org/offers?q={query}",
    "query": "required"
  }
}
</script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.moraltrade.org/" },
    { "@type": "ListItem", "position": 2, "name": "Browse offers", "item": "https://www.moraltrade.org/offers" }
  ]
}
</script>
```

If you server-render or pre-render listing detail pages, each detail page should also have its own unique `<title>`, `<meta name="description">`, canonical URL, and public field content present in the server-rendered HTML. Google’s JavaScript SEO documentation specifically calls out unique titles/descriptions and meaningful HTTP status codes for JS applications. citeturn32view2turn30view3

### Performance implementation notes

The page should be instrumented with field Web Vitals. web.dev recommends judging Core Web Vitals at the **75th percentile** and notes that CrUX, DevTools, PageSpeed Insights, Search Console, and the `web-vitals` library are standard measurement paths. LCP, INP, and CLS remain the key metrics. citeturn28view0turn28view1turn28view2turn28view3

Recommended implementation moves:

- server-render or pre-render the collection shell and first-page results
- reduce client-side rendering work for first paint
- instrument field Web Vitals
- add width/height to every card image
- reserve space for late-loading modules
- lazy-load only below-the-fold media
- do not lazy-load above-the-fold or LCP images
- use `fetchpriority="high"` for the actual LCP image if there is one
- break up long event-handler work and yield to the main thread on expensive interactions

These are directly aligned with web.dev guidance on LCP, INP, CLS, and image loading. citeturn35view0turn36view1turn36view2turn36view4turn36view5turn36view6turn36view7

Suggested RUM snippet:

```html
<script type="module">
  import { onLCP, onINP, onCLS } from 'https://unpkg.com/web-vitals@4/dist/web-vitals.attribution.js?module';

  function sendToAnalytics(metric) {
    navigator.sendBeacon('/api/rum', JSON.stringify(metric));
  }

  onLCP(sendToAnalytics);
  onINP(sendToAnalytics);
  onCLS(sendToAnalytics);
</script>
```

Suggested image usage:

```html
<img
  src="/images/example-card-victoria.webp"
  alt="Worked example card for Victoria"
  width="640"
  height="360"
  loading="lazy"
/>
```

For any hero/LCP image, remove lazy loading and set priority:

```html
<img
  src="/images/offers-hero.webp"
  alt=""
  width="1200"
  height="600"
  fetchpriority="high"
/>
```

## Validation, experimentation, and delivery plan

### QA checklist

A professional offers page should ship only after all of the following are true.

| QA area | What to verify |
|---|---|
| Content and IA | H1 is plain-language; tabs are sensible; duplicate/redundant modules are removed; taxonomy labels are consistent across filters, cards, and detail pages. |
| Functional browse | Search, sort, filters, pagination, empty states, tab persistence, and view toggles all sync correctly with URL state. |
| Accessibility | Keyboard-only browse works; visible focus is present; result updates are announced; filters meet minimum target size; labels are explicit; no unexpected focus jumps; no two-dimensional scroll at narrow widths. citeturn37view4turn40view1turn43view2turn39view1turn37view0 |
| SEO and rendering | Unique title/meta per page; canonical URLs correct; collection/detail pages render useful HTML without waiting on client hydration; sitemap contains intended URLs; structured data validates cleanly. citeturn30view3turn32view1turn32view2turn32view0turn28view7 |
| Performance | 75th-percentile LCP, INP, and CLS are tracked; card and hero images have dimensions; no layout shift from filter rail or trust modules; heavy interaction handlers are profiled. citeturn28view0turn28view1turn28view2turn28view3turn36view4turn36view5 |
| Mobile | Single-column layout works cleanly; toolbar collapses sensibly; filters do not create horizontal scrolling; cards remain readable and tappable. citeturn37view0turn39view1 |
| Analytics | Clicks, searches, facet use, save-search events, create-offer starts, and detail-page opens are all evented consistently. |

### A/B test ideas

Start with small, consequential experiments rather than cosmetic ones.

| Experiment | Variant A | Variant B | Primary metric | Why it matters |
|---|---|---|---|---|
| Default tab | Live offers first | Worked examples first when live count is zero | Detail-page opens / session | Tests the core inventory-positioning hypothesis |
| Hero wording | “Browse offers” | “Browse offers and worked examples” | Scroll to first card / search usage | Tests whether explicit framing reduces confusion |
| CTA strategy | `Create an offer` | `Explore examples` primary, `Create an offer` secondary | CTA CTR and create starts | Tests whether current low-liquidity state needs softer activation |
| Trust placement | Right rail | Inline trust strip above results | Detail-page CTR and bounce | Tests whether trust content helps or distracts |
| Filter surface | Toolbar + sticky rail | Toolbar + modal filters on mobile | Filter usage / task completion | Tests mobile browse efficiency |

### Success metrics

Use a compact scorecard.

| Metric | Starting target | Notes |
|---|---|---|
| Detail-page click-through from collection | +25% vs current baseline | Primary browse usefulness metric |
| Search usage rate | +20% | Indicates better task orientation |
| Create-offer starts | +15% | Measures conversion into supply creation |
| Save-search or notify-me rate | establish baseline, then +30% | Especially important while live inventory is low |
| Zero-result filtered sessions | -40% | Indicates healthier facet design |
| Bounce / rapid-exit rate | -20% | Proxy for clarity and first impression |
| LCP | ≤ 2.5s at p75 | web.dev good threshold citeturn28view1turn35view0 |
| INP | ≤ 200 ms at p75 | web.dev good threshold citeturn28view2turn36view0 |
| CLS | ≤ 0.1 at p75 | web.dev good threshold citeturn28view3turn36view4 |
| Indexed detail pages | upward trend after launch | Requires sitemap and canonical hygiene citeturn32view0turn32view1 |
| Organic CTR from search | +10% | Depends on title/meta and better page understanding citeturn30view3turn28view5 |

### Timeline and estimated effort

The hours below assume one senior engineer using Codex with strong product/design judgment, plus normal review time. A designer could compress iteration risk but is not strictly required if Codex is producing implementation-ready UI.

| Recommendation | Priority | Estimated effort |
|---|---|---:|
| Rewrite page shell, hero, top CTAs, tabs, and collection header | High | 12–18 h |
| Build responsive toolbar + sticky filter rail + URL state | High | 18–28 h |
| Normalize cards and create detail-page templates | High | 16–24 h |
| Add trust rail and contextual safety/evidence modules | High | 8–14 h |
| Accessibility remediation and semantic interaction pass | High | 12–20 h |
| SEO metadata, canonical logic, sitemap, structured data | High | 10–16 h |
| SSR/prerender and client-work reduction for first-page results | High | 12–24 h |
| Analytics + RUM instrumentation | High | 8–14 h |
| Saved search / notify-me / follow-cause features | Medium | 12–20 h |
| Editorial collection modules and featured rails | Medium | 10–16 h |
| Compare mode and power-user browse features | Medium | 10–16 h |
| Personalization / recently viewed / recommendations | Low | 12–24 h |
| QA, bug fixing, launch hardening, experiment wiring | Cross-cutting | 16–28 h |

A realistic initial redesign is therefore **134–262 hours** for an end-to-end implementation that includes architecture, accessibility, metadata, performance, analytics, and launch hardening. A narrower “Phase One” limited to the shell, cards, filters, accessibility, and metadata can likely ship in **76–120 hours**. Those estimates are consistent with the scope of the changes, especially because the page needs structural rethinking rather than superficial polish. citeturn16view0turn28view0turn32view2

## Open questions and limitations

Some important items could not be fully verified from the available browsing environment. I could directly inspect the live page content, navigation, and crawlable text, but I could not reliably inspect the raw HTML `<head>` for every metadata tag, collect live Core Web Vitals from CrUX/PageSpeed for the specific URL, or capture pixel-accurate desktop/mobile screenshots of the rendered page. Accordingly, the strongest conclusions here are about **information architecture, content hierarchy, terminology, trust placement, and functional browse design**. The weaker conclusions are about exact visual rendering, responsive breakpoints, and the current head-tag stack. Before implementation, run a final browser-based check with Lighthouse/PageSpeed, screen-reader smoke tests, and actual mobile device screenshots. citeturn16view0turn28view0turn32view5