(() => {
  "use strict";

  if (window.__moralTradeDiscoverSearchLoaded) return;
  window.__moralTradeDiscoverSearchLoaded = true;
  window.__moralTradeSmartQueryLoaded = true;

  const STORAGE_PREFIX = "moral-trade:discover-live-search:v3";
  const SUPPORTED_DOMAINS = new Set(["offers", "pools", "people"]);
  const SUPPORTED_OFFER_KINDS = new Set(["all", "individual", "co-fund"]);
  const SUPPORTED_SORTS = new Set([
    "best-fit",
    "newest",
    "deadline",
    "lowest-cost",
    "strongest-evidence",
  ]);

  const state = {
    query: "",
    normalizedQuery: "",
    domain: "offers",
    offerKind: "all",
    sort: "best-fit",
    manual: emptyManualFilters(),
    excludedConstraints: [],
    response: null,
    error: null,
    clarification: null,
    busy: false,
    sequence: 0,
    controller: null,
    sourcePassThrough: false,
    rendering: false,
    observerFrame: 0,
    filterTimer: 0,
  };

  function emptyManualFilters() {
    return {
      causes: [],
      verifiedOnly: false,
      maximumOfferAmountCents: null,
      minimumReturnAmountCents: null,
      offerTypes: [],
      returnTypes: [],
      recipient: "",
      evidence: "",
      flexibilities: [],
      deadlineBefore: null,
    };
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function parseCsv(value) {
    return value
      ? unique(value.split(",").map((entry) => entry.trim()).filter(Boolean))
      : [];
  }

  function dollarsToCents(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0
      ? Math.round(amount * 100)
      : null;
  }

  function getForm() {
    return document.getElementById("command-form");
  }

  function getQueryInput(form = getForm()) {
    return (
      form?.querySelector(
        'input[name="q"], input[name="command"], #command-input',
      ) || null
    );
  }

  function getSubmitButton(form = getForm()) {
    return form?.querySelector('button[type="submit"]') || null;
  }

  function visibleElement(selector) {
    const elements = [...document.querySelectorAll(selector)];
    return (
      elements.find((element) => element.getClientRects().length > 0) ||
      elements[0] ||
      null
    );
  }

  function initialUrl() {
    try {
      if (typeof window.__MT_DISCOVER_INITIAL_URL__ === "string") {
        return new URL(window.__MT_DISCOVER_INITIAL_URL__, location.origin);
      }
    } catch {
      // The current URL remains authoritative.
    }
    return new URL(location.href);
  }

  function readUrlState() {
    const current = new URL(location.href);
    const initial = initialUrl();
    const read = (key) =>
      current.searchParams.has(key)
        ? current.searchParams.get(key)
        : initial.searchParams.get(key);
    const has = (key) =>
      current.searchParams.has(key) || initial.searchParams.has(key);
    const rawDomain = read("domain");
    const rawSort = read("sort") || "best-fit";
    const sort =
      rawSort === "lowest-burden"
        ? "lowest-cost"
        : rawSort === "deadline-risk"
          ? "deadline"
          : SUPPORTED_SORTS.has(rawSort)
            ? rawSort
            : "best-fit";

    return {
      query: (read("q") || read("query") || "").trim(),
      normalizedQuery: (read("nq") || "").trim(),
      domain: SUPPORTED_DOMAINS.has(rawDomain) ? rawDomain : "offers",
      offerKind: SUPPORTED_OFFER_KINDS.has(read("offerKind"))
        ? read("offerKind")
        : "all",
      sort,
      excludedConstraints: parseCsv(read("exclude")),
      manual: {
        causes: parseCsv(read("causeFilter")),
        verifiedOnly: read("verified") === "1",
        maximumOfferAmountCents: has("max")
          ? dollarsToCents(read("max"))
          : null,
        minimumReturnAmountCents: has("minReturn")
          ? dollarsToCents(read("minReturn"))
          : null,
        offerTypes: parseCsv(read("offerType")),
        returnTypes: parseCsv(read("returnType")),
        recipient: read("recipient") || "",
        evidence: read("evidence") || "",
        flexibilities: parseCsv(read("flexibility")),
        deadlineBefore: read("deadline") || null,
      },
    };
  }

  function hydrateFromUrl() {
    Object.assign(state, readUrlState());
  }

  function activeSearch() {
    return Boolean(
      state.query ||
        state.response ||
        state.error ||
        state.clarification ||
        state.busy,
    );
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setText(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function setAttribute(element, name, value) {
    if (element && element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
    }
  }

  function installStyles() {
    if (document.getElementById("discover-live-search-styles")) return;
    const style = document.createElement("style");
    style.id = "discover-live-search-styles";
    style.textContent = `
      #discover-live-search-state{padding:9px 0 2px;display:grid;gap:8px}
      .discover-search-status{border-left:2px solid var(--blue,#123ff1);background:#eef1fc;padding:9px 12px;font:11px/1.45 var(--ui,monospace);display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .discover-search-status[data-tone="error"]{border-left-color:var(--red,#b7372e);background:var(--red-soft,#fae6e2)}
      .discover-search-status button{border:0;background:transparent;color:var(--blue,#123ff1);font-weight:750;cursor:pointer;padding:0;white-space:nowrap}
      .discover-search-chip-row{display:flex;flex-wrap:wrap;gap:6px}
      .discover-search-chip{border:1px solid #aaa9a4;background:#fffefa;padding:6px 8px;display:inline-flex;align-items:center;gap:8px;font:11px var(--ui,monospace);cursor:pointer}
      .discover-search-chip[data-source="manual"]{border-style:dashed}
      .discover-search-chip span:last-child{color:var(--muted,#6f706f)}
      .discover-clarification-actions{display:flex;flex-wrap:wrap;gap:8px}
      .discover-clarification-actions button{min-height:36px;padding:8px 13px;cursor:pointer;border:1px solid var(--line-dark,#8d8c87);background:transparent}
      .discover-clarification-actions button:first-child{background:var(--blue,#123ff1);border-color:var(--blue,#123ff1);color:white;font-weight:650}
      .discover-clarification-actions input{min-height:36px;border:1px solid var(--line-dark,#8d8c87);background:#fffefa;padding:8px 10px;min-width:220px}
      .discover-live-result a{text-decoration:none;color:inherit}
      .discover-live-result .primary-btn,.discover-live-result .outline-btn,.discover-live-result .quiet-btn{display:grid;place-items:center;text-align:center}
      .discover-live-person{grid-template-columns:minmax(260px,1.5fr) minmax(160px,.7fr) minmax(140px,.6fr) 150px}
      .discover-live-person .row-main{border-right:1px solid var(--line,#c9c7c0)}
      .discover-live-zero-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:18px}
      .discover-live-zero-actions button{border:1px solid var(--line-dark,#8d8c87);background:transparent;padding:10px 13px;cursor:pointer}
      .discover-live-zero-constraints{margin:14px auto 0;padding:0;list-style:none;display:grid;gap:5px;max-width:520px;text-align:left;font:11px/1.4 var(--ui,monospace)}
      @media(max-width:760px){
        #discover-live-search-state{padding-top:6px}
        .discover-search-status{font-size:10.5px}
        .discover-live-person{grid-template-columns:minmax(0,1fr) 94px;padding:13px 0}
        .discover-live-person .row-main{grid-column:1;border-right:0;padding:0 8px!important}
        .discover-live-person .requester-cell,.discover-live-person .mechanism-cell{display:none}
        .discover-live-person .row-actions{grid-column:2;padding:18px 4px 0!important}
      }
    `;
    document.head.append(style);
  }

  function ensureRuntimePanel() {
    const form = getForm();
    if (!form) return null;
    let panel = document.getElementById("discover-live-search-state");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "discover-live-search-state";
      panel.dataset.testid = "discover-live-search-state";
      form.insertAdjacentElement("afterend", panel);
    }
    return panel;
  }

  function formatCount(domain, count) {
    const noun =
      domain === "people"
        ? count === 1
          ? "person"
          : "people"
        : domain === "pools"
          ? count === 1
            ? "pool"
            : "pools"
          : count === 1
            ? "offer"
            : "offers";
    return `<strong>${count}</strong> matching ${noun}`;
  }

  function renderClarificationHtml(clarificationState) {
    const definition = clarificationState.definition;
    const options =
      Array.isArray(definition.options) && definition.options.length
        ? definition.options
            .map(
              (option) =>
                `<button type="button" data-discover-clarification-answer="${escapeHtml(option)}">${escapeHtml(option)}</button>`,
            )
            .join("")
        : `<input type="text" data-discover-clarification-input aria-label="Clarification answer"><button type="button" data-discover-action="continue-clarification">Continue search</button>`;
    return `<div data-testid="discover-smart-query-clarification"><div class="discover-search-status" role="status" aria-live="polite"><span><strong>One detail changes the results.</strong> ${escapeHtml(definition.question)}</span></div><div class="discover-clarification-actions" data-discover-clarification-field="${escapeHtml(definition.field)}">${options}<button type="button" data-discover-action="keep-editing">Keep editing</button></div></div>`;
  }

  function renderPanel() {
    const panel = ensureRuntimePanel();
    if (!panel) return;
    const response = state.response;
    let status = "";
    if (state.clarification) {
      status = renderClarificationHtml(state.clarification);
    } else if (state.error) {
      status = `<div class="discover-search-status" data-tone="error" role="alert"><span><strong>${escapeHtml(state.error.title)}</strong> ${escapeHtml(state.error.message)}</span><button type="button" data-discover-action="retry">Retry</button></div>`;
    } else if (state.busy) {
      status = `<div class="discover-search-status" role="status" aria-live="polite"><span><strong>Searching…</strong> Current results remain visible until live replacements are ready.</span></div>`;
    } else if (response) {
      const checkedAt = new Date(response.checkedAt);
      const checkedLabel = Number.isNaN(checkedAt.getTime())
        ? "just now"
        : checkedAt.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          });
      status = `<div class="discover-search-status" role="status" aria-live="polite"><span>Live ${escapeHtml(response.domain)} checked ${escapeHtml(checkedLabel)}. ${response.truncated ? `Showing the first ${response.items.length} of ${response.total}.` : `${response.total} exact ${response.total === 1 ? "match" : "matches"}.`}</span></div>`;
    }

    const constraints = response?.constraints || [];
    const chips = constraints.length
      ? `<div class="discover-search-chip-row" aria-label="Active search constraints">${constraints
          .map(
            (constraint) =>
              `<button type="button" class="discover-search-chip" data-source="${escapeHtml(constraint.source)}" data-discover-remove-constraint="${escapeHtml(constraint.key)}" title="Remove ${escapeHtml(constraint.label)}"><span>${escapeHtml(constraint.label)}</span><span aria-hidden="true">×</span></button>`,
          )
          .join("")}</div>`
      : "";
    const html = `${status}${chips}`;
    if (panel.innerHTML !== html) panel.innerHTML = html;

    const hideSourceInterpretation = Boolean(
      response || state.busy || state.error || state.clarification,
    );
    document
      .querySelectorAll(".parsed-wrap,.route-note,.parser-warning")
      .forEach((element) => {
        if (element.hidden !== hideSourceInterpretation) {
          element.hidden = hideSourceInterpretation;
        }
      });
  }

  function updateSubmitChrome() {
    const form = getForm();
    if (!form) return;
    setAttribute(form, "aria-busy", String(state.busy));
    const button = getSubmitButton(form);
    if (button) {
      setText(button, state.busy ? "Searching…" : "Search");
      if (button.disabled !== state.busy) button.disabled = state.busy;
    }
    const input = getQueryInput(form);
    if (
      input &&
      state.query &&
      document.activeElement !== input &&
      input.value !== state.query
    ) {
      input.value = state.query;
    }
  }

  function updateDomainTabs() {
    const counts = state.response?.counts || null;
    const isActive = activeSearch();
    document
      .querySelectorAll('[data-action="set-domain"][data-domain]')
      .forEach((tab) => {
        const domain = tab.dataset.domain;
        if (!SUPPORTED_DOMAINS.has(domain)) return;
        if (!tab.dataset.discoverOriginalLabel) {
          tab.dataset.discoverOriginalLabel = (tab.textContent || domain)
            .replace(/\s+\d+$/, "")
            .trim();
        }
        const baseLabel = tab.dataset.discoverOriginalLabel;
        const label = counts ? `${baseLabel} ${counts[domain]}` : baseLabel;
        setText(tab, label);
        if (isActive) {
          setAttribute(tab, "aria-selected", String(domain === state.domain));
          if (tab.tabIndex !== (domain === state.domain ? 0 : -1)) {
            tab.tabIndex = domain === state.domain ? 0 : -1;
          }
        }
      });
  }

  function removeResultExplanations() {
    document
      .querySelectorAll(".match-reason")
      .forEach((element) => element.remove());
  }

  function upgradeBaseUi() {
    installStyles();
    ensureRuntimePanel();
    updateSubmitChrome();
    updateDomainTabs();
    renderPanel();
    removeResultExplanations();
  }

  function serializeRuntimeState() {
    return {
      query: state.query,
      normalizedQuery: state.normalizedQuery,
      domain: state.domain,
      offerKind: state.offerKind,
      sort: state.sort,
      manual: structuredClone(state.manual),
      excludedConstraints: [...state.excludedConstraints],
    };
  }

  function buildUrl() {
    const params = new URLSearchParams();
    params.set("domain", state.domain);
    params.set("view", "list");
    if (state.domain === "offers" && state.offerKind !== "all") {
      params.set("offerKind", state.offerKind);
    }
    if (state.query) params.set("q", state.query);
    if (state.normalizedQuery && state.normalizedQuery !== state.query) {
      params.set("nq", state.normalizedQuery);
    }
    if (state.sort !== "best-fit") params.set("sort", state.sort);
    if (state.excludedConstraints.length) {
      params.set("exclude", state.excludedConstraints.join(","));
    }
    if (state.manual.causes.length) {
      params.set("causeFilter", state.manual.causes.join(","));
    }
    if (state.manual.verifiedOnly) params.set("verified", "1");
    if (state.manual.maximumOfferAmountCents !== null) {
      params.set("max", String(state.manual.maximumOfferAmountCents / 100));
    }
    if (state.manual.minimumReturnAmountCents !== null) {
      params.set(
        "minReturn",
        String(state.manual.minimumReturnAmountCents / 100),
      );
    }
    if (state.manual.offerTypes.length) {
      params.set("offerType", state.manual.offerTypes.join(","));
    }
    if (state.manual.returnTypes.length) {
      params.set("returnType", state.manual.returnTypes.join(","));
    }
    if (state.manual.recipient) params.set("recipient", state.manual.recipient);
    if (state.manual.evidence) params.set("evidence", state.manual.evidence);
    if (state.manual.flexibilities.length) {
      params.set("flexibility", state.manual.flexibilities.join(","));
    }
    if (state.manual.deadlineBefore) {
      params.set("deadline", state.manual.deadlineBefore);
    }
    const query = params.toString();
    return `${location.pathname}${query ? `?${query}` : ""}#discover`;
  }

  function scrollStorageKey() {
    return `${STORAGE_PREFIX}:scroll:${location.pathname}${location.search}`;
  }

  function saveScrollPosition() {
    try {
      const value = document.getElementById("view-scroll")?.scrollTop || 0;
      sessionStorage.setItem(scrollStorageKey(), String(value));
    } catch {
      // Browser-native restoration remains available.
    }
  }

  function restoreScrollPosition() {
    try {
      const value = Number(sessionStorage.getItem(scrollStorageKey()) || "0");
      if (value > 0) {
        requestAnimationFrame(() => {
          const scroll = document.getElementById("view-scroll");
          if (scroll) scroll.scrollTop = value;
        });
      }
    } catch {
      // Browser-native restoration remains available.
    }
  }

  function writeHistory(mode) {
    if (mode === "none") return;
    saveScrollPosition();
    const current =
      history.state && typeof history.state === "object" ? history.state : {};
    const currentDepth = Number(current.depth || 0);
    const payload = {
      ...current,
      discover: true,
      depth: mode === "push" ? currentDepth + 1 : currentDepth,
      state: current.state || {},
      discoverLiveSearch: serializeRuntimeState(),
    };
    if (mode === "push") history.pushState(payload, "", buildUrl());
    else history.replaceState(payload, "", buildUrl());
  }

  function appendIntent(href, intent) {
    try {
      const url = new URL(href, location.origin);
      url.searchParams.set("intent", intent);
      return url.origin === location.origin
        ? `${url.pathname}${url.search}${url.hash}`
        : url.href;
    } catch {
      return href;
    }
  }

  function bulletList(items) {
    return `<ul class="exchange-obligations">${items
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("")}</ul>`;
  }

  function renderOfferRow(item) {
    const offerKind = item.offerKind === "co-fund" ? "co-fund" : "individual";
    const intent = offerKind === "co-fund" ? "join-cofund" : "exact-match";
    const counteroffer = item.counteroffersAllowed
      ? `<a class="outline-btn" href="${escapeHtml(appendIntent(item.href, "counteroffer"))}" data-discover-result-link="true">Counteroffer</a>`
      : "";
    return `<article class="transaction-row offer-transaction-row discover-live-result" data-row-id="${escapeHtml(item.id)}" data-offer-kind="${offerKind}" data-live-record="true">
      <div class="compare-cell" aria-hidden="true"></div>
      <a class="offer-row-content" href="${escapeHtml(item.href)}" data-discover-result-link="true" aria-label="Open full terms for ${escapeHtml(item.title)}">
        <div class="offer-row-meta"><div class="eyebrow"><span class="status-dot"></span>${escapeHtml(item.cause)} · ${escapeHtml(item.status)}</div><div class="offer-row-deadline">${escapeHtml(item.completionLabel)}</div></div>
        <div class="exchange-grid">
          <section class="exchange-side" data-exchange-side="offer" aria-label="You offer"><div class="exchange-side-head"><span class="exchange-label">You offer</span><span class="exchange-flexibility">${escapeHtml(item.offerFlexibility)}</span></div>${bulletList(item.youOffer)}</section>
          <div class="exchange-arrow" aria-hidden="true">↔</div>
          <section class="exchange-side" data-exchange-side="return" aria-label="You get"><div class="exchange-side-head"><span class="exchange-label">You get</span><span class="exchange-flexibility">${escapeHtml(item.returnFlexibility)}</span></div>${bulletList(item.youGet)}<div class="exchange-provider">Provided by <strong>${escapeHtml(item.providerName)}</strong> · ${escapeHtml(item.providerRole)}</div></section>
        </div>
        <div class="offer-context"><div class="offer-context-copy"><h3 class="offer-context-title">${escapeHtml(item.title)}</h3></div></div>
      </a>
      <div class="row-actions">
        <a class="primary-btn" href="${escapeHtml(appendIntent(item.href, intent))}" data-discover-result-link="true">${escapeHtml(item.exactMatchLabel)} →</a>
        ${counteroffer}
        <a class="quiet-btn" href="${escapeHtml(item.href)}" data-discover-result-link="true">Full terms →</a>
        <div class="cell-secondary">${escapeHtml(item.evidenceLabel)}</div>
      </div>
    </article>`;
  }

  function renderPoolRow(item) {
    return `<article class="transaction-row offer-transaction-row discover-live-result" data-row-id="${escapeHtml(item.id)}" data-live-record="true">
      <div class="compare-cell" aria-hidden="true"></div>
      <a class="offer-row-content" href="${escapeHtml(item.href)}" data-discover-result-link="true" aria-label="Open ${escapeHtml(item.title)}">
        <div class="offer-row-meta"><div class="eyebrow"><span class="status-dot"></span>${escapeHtml(item.cause)} · ${escapeHtml(item.status)}</div><div class="offer-row-deadline">${escapeHtml(item.completionLabel)}</div></div>
        <div class="exchange-grid">
          <section class="exchange-side" data-exchange-side="offer" aria-label="You offer"><div class="exchange-side-head"><span class="exchange-label">You offer</span><span class="exchange-flexibility">Conditional</span></div>${bulletList(item.youOffer)}</section>
          <div class="exchange-arrow" aria-hidden="true">↔</div>
          <section class="exchange-side" data-exchange-side="return" aria-label="You get"><div class="exchange-side-head"><span class="exchange-label">You get</span><span class="exchange-flexibility">Threshold</span></div>${bulletList(item.youGet)}<div class="exchange-provider">Administered by <strong>${escapeHtml(item.providerName)}</strong></div></section>
        </div>
        <div class="offer-context"><div class="offer-context-copy"><h3 class="offer-context-title">${escapeHtml(item.title)}</h3></div></div>
      </a>
      <div class="row-actions"><a class="primary-btn" href="${escapeHtml(item.href)}" data-discover-result-link="true">View pool →</a><div class="cell-secondary">${escapeHtml(item.evidenceLabel)}</div></div>
    </article>`;
  }

  function renderPersonRow(item) {
    return `<article class="transaction-row people-row discover-live-person discover-live-result" data-row-id="${escapeHtml(item.id)}" data-live-record="true">
      <div class="row-main"><div class="eyebrow"><span class="status-dot ${item.verified ? "" : "stale"}"></span>${item.verified ? "Verified public member" : "Reviewed public member"}</div><h3 class="row-title">${escapeHtml(item.title)}</h3><p class="row-description">${escapeHtml(item.summary)}</p><span class="mobile-row-meta" style="display:none">${escapeHtml(item.subtitle)} · ${escapeHtml(item.location)}</span></div>
      <div class="requester-cell"><span class="cell-label">Public profile</span><div class="cell-primary">${escapeHtml(item.subtitle)}</div><div class="cell-secondary">${escapeHtml(item.causes.join(" · ") || "No public causes")}</div></div>
      <div class="mechanism-cell"><span class="cell-label">Location</span><div class="cell-primary">${escapeHtml(item.location)}</div><div class="cell-secondary">${item.openOfferCount} open ${item.openOfferCount === 1 ? "offer" : "offers"}</div></div>
      <div class="row-actions"><a class="primary-btn" href="${escapeHtml(item.href)}" data-discover-result-link="true">View person →</a></div>
    </article>`;
  }

  function zeroStateHtml(response) {
    const constraints = response.constraints || [];
    const constraintList = constraints.length
      ? `<ul class="discover-live-zero-constraints">${constraints
          .map((constraint) => `<li>• ${escapeHtml(constraint.label)}</li>`)
          .join("")}</ul>`
      : "";
    const otherDomains = ["offers", "pools", "people"].filter(
      (domain) => domain !== response.domain,
    );
    const domainActions = otherDomains
      .map(
        (domain) =>
          `<button type="button" data-discover-domain="${domain}">Search ${domain[0].toUpperCase()}${domain.slice(1)} (${response.counts[domain]})</button>`,
      )
      .join("");
    const verificationConstraint = constraints.find(
      (constraint) =>
        constraint.key === "verified" ||
        constraint.key === "manual-verified",
    );
    const relax = verificationConstraint
      ? `<button type="button" data-discover-remove-constraint="${escapeHtml(verificationConstraint.key)}">Include verification-pending records</button>`
      : "";
    return `<div class="state-panel" data-live-search-zero="true"><div class="state-panel-inner"><h2>No active ${escapeHtml(response.domain)} match “${escapeHtml(state.query || "this search")}”</h2><p>The active hard constraints produced no exact live result. No unrelated record has been counted as a match.</p>${constraintList}<div class="discover-live-zero-actions">${relax}${domainActions}<button type="button" data-discover-action="clear">Clear search</button></div></div></div>`;
  }

  function liveResultsIntact(response = state.response) {
    const list = document.querySelector(".transaction-list");
    if (!response || !list || list.dataset.liveSearchResults !== "true") {
      return false;
    }
    if (response.items.length === 0) {
      return Boolean(list.querySelector('[data-live-search-zero="true"]'));
    }
    return (
      list.querySelectorAll('[data-live-record="true"]').length ===
      response.items.length
    );
  }

  function updateHeading() {
    const title = document.querySelector(".view-title h2");
    const description = document.querySelector(".view-title p");
    const titleText =
      state.domain === "people"
        ? "People you can reach"
        : state.domain === "pools"
          ? "Standalone threshold pools"
          : state.offerKind === "co-fund"
            ? "Live Co-Funds"
            : "Current opportunities";
    const descriptionText =
      state.domain === "offers" && state.offerKind === "co-fund"
        ? "Live reciprocal trades whose contribution side is fulfilled by a contributor group."
        : state.domain === "offers"
          ? "Compare what you offer and what you get from live, publishable offers."
          : state.domain === "pools"
            ? "Live standalone threshold-funded moral public goods matching the active hard constraints."
            : "Reviewed public members matching the active query and hard constraints.";
    setText(title, titleText);
    setText(description, descriptionText);
  }

  function currentRequest(sequence, controller) {
    return (
      sequence === state.sequence &&
      controller === state.controller &&
      !controller.signal.aborted
    );
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }

  async function waitForListSurface(sequence, controller, attempts = 30) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (!currentRequest(sequence, controller)) return null;
      const list = document.querySelector(".transaction-list");
      if (list) return list;
      await nextFrame();
    }
    return null;
  }

  function ensureLiveListSurface(response) {
    const existing = document.querySelector(".transaction-list");
    if (existing) return existing;
    const scroll = document.getElementById("view-scroll");
    if (!scroll) return null;
    const section = document.createElement("section");
    section.className = "view-stage list-stage";
    section.id = "discover-view";
    section.setAttribute("role", "tabpanel");
    section.innerHTML = `<div class="view-head"><div class="view-title"><h2></h2><p></p></div></div><div class="transaction-list"></div>`;
    scroll.replaceChildren(section);
    return section.querySelector(".transaction-list");
  }

  function sourceClick(element) {
    if (!(element instanceof HTMLElement)) return false;
    state.sourcePassThrough = true;
    try {
      element.click();
    } finally {
      state.sourcePassThrough = false;
    }
    return true;
  }

  async function prepareListSurface(response, sequence, controller) {
    const domain = response.domain;
    let sourceNavigated = false;
    const selectedDomain = visibleElement(
      `[data-action="set-domain"][data-domain="${domain}"][aria-selected="true"]`,
    );
    if (!selectedDomain) {
      const domainTab = visibleElement(
        `[data-action="set-domain"][data-domain="${domain}"]`,
      );
      sourceNavigated = sourceClick(domainTab) || sourceNavigated;
      await nextFrame();
    }
    if (!currentRequest(sequence, controller)) {
      return { list: null, sourceNavigated };
    }
    if (domain === "offers") {
      const selectedOfferKind = visibleElement(
        `[data-action="set-offer-kind"][data-offer-kind="${state.offerKind}"][aria-selected="true"]`,
      );
      if (!selectedOfferKind) {
        const offerKindControl = visibleElement(
          `[data-action="set-offer-kind"][data-offer-kind="${state.offerKind}"]`,
        );
        sourceNavigated = sourceClick(offerKindControl) || sourceNavigated;
        await nextFrame();
      }
    }
    if (!currentRequest(sequence, controller)) {
      return { list: null, sourceNavigated };
    }
    const selectedList = visibleElement(
      '[data-action="set-view"][data-view="list"][aria-selected="true"]',
    );
    if (!selectedList) {
      const listTab = visibleElement(
        '[data-action="set-view"][data-view="list"]',
      );
      sourceNavigated = sourceClick(listTab) || sourceNavigated;
      await nextFrame();
    }
    let list = await waitForListSurface(sequence, controller);
    if (!list && currentRequest(sequence, controller)) {
      list = ensureLiveListSurface(response);
    }
    return { list, sourceNavigated };
  }

  async function renderResults(response, sequence, controller) {
    if (!currentRequest(sequence, controller)) return false;
    const { list, sourceNavigated } = await prepareListSurface(
      response,
      sequence,
      controller,
    );
    if (!list || !currentRequest(sequence, controller)) return false;
    state.rendering = true;
    try {
      const html = response.items.length
        ? response.items
            .map((item) =>
              item.kind === "offer"
                ? renderOfferRow(item)
                : item.kind === "pool"
                  ? renderPoolRow(item)
                  : renderPersonRow(item),
            )
            .join("")
        : zeroStateHtml(response);
      if (list.innerHTML !== html) list.innerHTML = html;
      list.dataset.liveSearchResults = "true";
      const count = document.querySelector(".result-count");
      if (count) {
        const countHtml = formatCount(response.domain, response.total);
        if (count.innerHTML !== countHtml) count.innerHTML = countHtml;
      }
      updateHeading();
      updateDomainTabs();
      renderPanel();
      removeResultExplanations();
      restoreScrollPosition();
    } finally {
      state.rendering = false;
    }
    return sourceNavigated;
  }

  function errorForResponse(response, payload) {
    if (response?.status === 401 || response?.status === 403) {
      return {
        title: "Session expired.",
        message: "Sign in again, then retry the preserved search.",
      };
    }
    if (response?.status === 408 || response?.status === 504) {
      return {
        title: "Search timed out.",
        message: "The query and previous results were preserved.",
      };
    }
    return {
      title:
        payload?.error?.kind === "marketplace_retrieval_failed"
          ? "Marketplace retrieval failed."
          : payload?.error?.kind === "interpretation_failed"
            ? "Query interpretation failed."
            : "Search failed.",
      message:
        payload?.error?.message ||
        "The query and previous results were preserved.",
    };
  }

  function shouldUseSharedInterpreter(query) {
    const normalized = query.toLowerCase();
    const standaloneAmount =
      /(?:^|\s)\$\s*\d/.test(normalized) &&
      !/\b(under|below|less than|no more than|at most|up to|max(?:imum)?|over|more than|at least|min(?:imum)?|exact(?:ly)?)\s*\$/.test(
        normalized,
      );
    const complexExchange =
      normalized.trim().split(/\s+/).length >= 6 &&
      /\sfor\s/.test(normalized);
    return standaloneAmount || complexExchange;
  }

  async function callInterpreter(query, clarification, signal) {
    const response = await fetch("/api/query/interpret", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, surface: "discover", clarification }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.interpretation) {
      const error = new Error(
        payload?.error || "Query interpretation failed",
      );
      error.response = response;
      error.payload = {
        error: {
          kind: "interpretation_failed",
          message: payload?.error || "The query could not be interpreted.",
        },
      };
      throw error;
    }
    return payload;
  }

  async function fetchLiveSearch(sequence, controller) {
    const response = await fetch("/api/discover/search", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: state.query,
        normalizedQuery: state.normalizedQuery || undefined,
        domain: state.domain,
        offerKind: state.offerKind,
        sort: state.sort,
        manual: state.manual,
        excludedConstraints: state.excludedConstraints,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      const error = new Error(payload?.error?.message || "Search failed");
      error.response = response;
      error.payload = payload;
      throw error;
    }
    return currentRequest(sequence, controller) ? payload : null;
  }

  function rewriteClarifiedQuery(query, field, answer) {
    if (field === "amount") {
      const replacement = /^max/i.test(answer)
        ? "under $"
        : /^min/i.test(answer)
          ? "at least $"
          : /^exact/i.test(answer)
            ? "exactly $"
            : null;
      if (replacement) {
        return query.replace(
          /\$\s*([0-9][0-9,]*(?:\.\d{1,2})?)/,
          `${replacement}$1`,
        );
      }
    }
    return `${query} ${answer}`.trim();
  }

  function setClarification(query, definition) {
    state.clarification = { query, definition };
    state.busy = false;
    updateSubmitChrome();
    renderPanel();
  }

  function cancelCurrentSearch() {
    state.controller?.abort();
    state.controller = null;
    state.sequence += 1;
    state.busy = false;
    updateSubmitChrome();
  }

  async function executeSearch({
    historyMode = "push",
    forceInterpreter = false,
    clarification = null,
  } = {}) {
    const currentQuery = (getQueryInput()?.value || state.query || "").trim();
    state.controller?.abort();
    const controller = new AbortController();
    const sequence = state.sequence + 1;
    state.sequence = sequence;
    state.controller = controller;
    state.query = currentQuery;
    state.error = null;
    state.clarification = null;
    state.busy = true;
    upgradeBaseUi();

    try {
      let interpreted = false;
      if (
        currentQuery &&
        (forceInterpreter || shouldUseSharedInterpreter(currentQuery))
      ) {
        const interpretedPayload = await callInterpreter(
          currentQuery,
          clarification,
          controller.signal,
        );
        if (!currentRequest(sequence, controller)) return;
        const interpretation = interpretedPayload.interpretation;
        if (
          interpretation.needsClarification &&
          interpretation.clarification
        ) {
          setClarification(currentQuery, interpretation.clarification);
          return;
        }
        state.normalizedQuery = interpretation.normalizedQuery || currentQuery;
        interpreted = true;
      } else if (!currentQuery) {
        state.normalizedQuery = "";
      }

      let payload = await fetchLiveSearch(sequence, controller);
      if (!payload || !currentRequest(sequence, controller)) return;
      if (payload.clarification) {
        setClarification(currentQuery, payload.clarification);
        return;
      }

      if (
        payload.requiresSharedInterpretation &&
        currentQuery &&
        !interpreted
      ) {
        const interpretedPayload = await callInterpreter(
          currentQuery,
          null,
          controller.signal,
        );
        if (!currentRequest(sequence, controller)) return;
        const interpretation = interpretedPayload.interpretation;
        if (
          interpretation.needsClarification &&
          interpretation.clarification
        ) {
          setClarification(currentQuery, interpretation.clarification);
          return;
        }
        state.normalizedQuery = interpretation.normalizedQuery || currentQuery;
        payload = await fetchLiveSearch(sequence, controller);
        if (!payload || !currentRequest(sequence, controller)) return;
      }

      if (!currentRequest(sequence, controller)) return;
      state.response = payload;
      state.domain = payload.domain;
      state.offerKind =
        payload.domain === "offers" && SUPPORTED_OFFER_KINDS.has(payload.offerKind)
          ? payload.offerKind
          : "all";
      state.sort = payload.sort;
      state.error = null;
      const sourceNavigated = await renderResults(
        payload,
        sequence,
        controller,
      );
      if (!currentRequest(sequence, controller)) return;
      writeHistory(
        sourceNavigated && historyMode === "push"
          ? "replace"
          : historyMode,
      );
    } catch (error) {
      if (
        error?.name === "AbortError" ||
        !currentRequest(sequence, controller)
      ) {
        return;
      }
      state.error = errorForResponse(error.response, error.payload);
    } finally {
      if (currentRequest(sequence, controller)) {
        state.busy = false;
        upgradeBaseUi();
      }
    }
  }

  function submitCurrentQuery() {
    if (state.busy) return;
    state.excludedConstraints = [];
    state.normalizedQuery = "";
    state.clarification = null;
    executeSearch({ historyMode: "push" });
  }

  function setDomain(domain) {
    if (!SUPPORTED_DOMAINS.has(domain)) return;
    state.domain = domain;
    if (domain !== "offers") state.offerKind = "all";
    executeSearch({ historyMode: "push" });
  }

  function setOfferKind(offerKind) {
    if (!SUPPORTED_OFFER_KINDS.has(offerKind)) return;
    state.domain = "offers";
    state.offerKind = offerKind;
    executeSearch({ historyMode: "push" });
  }

  function toggleArray(values, value, checked) {
    return checked
      ? unique([...values, value])
      : values.filter((entry) => entry !== value);
  }

  function handleManualChange(target) {
    const filter = target.dataset.filter;
    if (!filter) return false;
    if (filter === "offer-kind") {
      setOfferKind(target.value);
      return true;
    }
    if (filter === "cause") {
      state.manual.causes = toggleArray(
        state.manual.causes,
        target.value,
        target.checked,
      );
    } else if (filter === "verified") {
      state.manual.verifiedOnly = target.checked;
    } else if (filter === "offer-type") {
      state.manual.offerTypes = toggleArray(
        state.manual.offerTypes,
        target.value,
        target.checked,
      );
    } else if (filter === "return-type") {
      state.manual.returnTypes = toggleArray(
        state.manual.returnTypes,
        target.value,
        target.checked,
      );
    } else if (filter === "flexibility") {
      state.manual.flexibilities = toggleArray(
        state.manual.flexibilities,
        target.value,
        target.checked,
      );
    } else if (filter === "deadline") {
      state.manual.deadlineBefore = target.value || null;
    } else if (filter === "sort") {
      const mapped =
        target.value === "lowest-burden"
          ? "lowest-cost"
          : target.value === "deadline-risk"
            ? "deadline"
            : target.value;
      state.sort = SUPPORTED_SORTS.has(mapped) ? mapped : "best-fit";
    } else {
      return false;
    }
    executeSearch({ historyMode: "push" });
    return true;
  }

  function handleManualInput(target) {
    const filter = target.dataset.filter;
    if (!filter) return false;
    if (filter === "max") {
      state.manual.maximumOfferAmountCents = Math.round(
        Number(target.value) * 100,
      );
      setText(
        document.getElementById("max-output"),
        Number(target.value) >= 250 ? "$250+" : `$${target.value}`,
      );
    } else if (filter === "min-return") {
      state.manual.minimumReturnAmountCents = Math.round(
        Number(target.value) * 100,
      );
      setText(
        document.getElementById("min-return-output"),
        Number(target.value) ? `$${target.value}` : "Any",
      );
    } else if (filter === "recipient") {
      state.manual.recipient = target.value.trim();
    } else if (filter === "evidence") {
      state.manual.evidence = target.value.trim();
    } else {
      return false;
    }
    clearTimeout(state.filterTimer);
    state.filterTimer = setTimeout(
      () => executeSearch({ historyMode: "replace" }),
      240,
    );
    return true;
  }

  function removeConstraint(key) {
    if (key.startsWith("manual-cause:")) {
      state.manual.causes = state.manual.causes.filter(
        (cause) => cause !== key.slice(13),
      );
    } else if (key === "manual-verified") {
      state.manual.verifiedOnly = false;
    } else if (key === "manual-offer-max") {
      state.manual.maximumOfferAmountCents = null;
    } else if (key === "manual-return-min") {
      state.manual.minimumReturnAmountCents = null;
    } else if (key.startsWith("manual-offer-type:")) {
      state.manual.offerTypes = state.manual.offerTypes.filter(
        (type) => type !== key.slice(18),
      );
    } else if (key.startsWith("manual-return-type:")) {
      state.manual.returnTypes = state.manual.returnTypes.filter(
        (type) => type !== key.slice(19),
      );
    } else if (key === "manual-recipient") {
      state.manual.recipient = "";
    } else if (key === "manual-evidence") {
      state.manual.evidence = "";
    } else if (key.startsWith("manual-flexibility:")) {
      state.manual.flexibilities = state.manual.flexibilities.filter(
        (value) => value !== key.slice(19),
      );
    } else if (key === "manual-deadline") {
      state.manual.deadlineBefore = null;
    } else {
      state.excludedConstraints = unique([
        ...state.excludedConstraints,
        key,
      ]);
    }
    executeSearch({ historyMode: "push" });
  }

  async function clearSearch() {
    cancelCurrentSearch();
    state.query = "";
    state.normalizedQuery = "";
    state.domain = "offers";
    state.offerKind = "all";
    state.sort = "best-fit";
    state.response = null;
    state.error = null;
    state.clarification = null;
    state.excludedConstraints = [];
    state.manual = emptyManualFilters();
    const input = getQueryInput();
    if (input) input.value = "";
    const reset = visibleElement('[data-action="reset"]');
    if (reset) {
      sourceClick(reset);
      await nextFrame();
    } else {
      const offerTab = visibleElement(
        '[data-action="set-domain"][data-domain="offers"]',
      );
      sourceClick(offerTab);
      await nextFrame();
      const listTab = visibleElement(
        '[data-action="set-view"][data-view="list"]',
      );
      sourceClick(listTab);
      await nextFrame();
    }
    writeHistory("replace");
    upgradeBaseUi();
  }

  function answerClarification(answer) {
    const current = state.clarification;
    if (!current) return;
    state.normalizedQuery = rewriteClarifiedQuery(
      current.query,
      current.definition.field,
      answer,
    );
    state.clarification = null;
    executeSearch({
      historyMode: "push",
      forceInterpreter: true,
      clarification: {
        field: current.definition.field,
        answer,
      },
    });
  }

  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.id !== "command-form") {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      submitCurrentQuery();
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      const queryInput = getQueryInput();
      if (
        event.key === "Enter" &&
        event.target === queryInput &&
        !event.isComposing &&
        !event.repeat
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        submitCurrentQuery();
        return;
      }
      if (
        event.key === "Enter" &&
        event.target instanceof HTMLInputElement &&
        event.target.matches("[data-discover-clarification-input]")
      ) {
        event.preventDefault();
        const answer = event.target.value.trim();
        if (answer) answerClarification(answer);
      }
    },
    true,
  );

  document.addEventListener(
    "click",
    (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest("button,a,[data-action]")
          : null;
      if (!target) return;

      const offerKindControl = target.closest(
        '[data-action="set-offer-kind"][data-offer-kind]',
      );
      if (offerKindControl && !state.sourcePassThrough && activeSearch()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOfferKind(offerKindControl.dataset.offerKind);
        return;
      }

      const domainTab = target.closest(
        '[data-action="set-domain"][data-domain]',
      );
      if (domainTab && !state.sourcePassThrough && activeSearch()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setDomain(domainTab.dataset.domain);
        return;
      }

      const remove = target.closest(
        "[data-discover-remove-constraint]",
      );
      if (remove) {
        event.preventDefault();
        removeConstraint(remove.dataset.discoverRemoveConstraint);
        return;
      }

      const domainAction = target.closest("[data-discover-domain]");
      if (domainAction) {
        event.preventDefault();
        setDomain(domainAction.dataset.discoverDomain);
        return;
      }

      const clarificationAnswer = target.closest(
        "[data-discover-clarification-answer]",
      );
      if (clarificationAnswer) {
        event.preventDefault();
        answerClarification(
          clarificationAnswer.dataset.discoverClarificationAnswer,
        );
        return;
      }

      const action = target.closest("[data-discover-action]");
      if (action) {
        event.preventDefault();
        const name = action.dataset.discoverAction;
        if (name === "retry") {
          executeSearch({ historyMode: "replace" });
        } else if (name === "clear") {
          clearSearch();
        } else if (name === "keep-editing") {
          state.clarification = null;
          renderPanel();
          getQueryInput()?.focus();
        } else if (name === "continue-clarification") {
          const answer = document
            .querySelector("[data-discover-clarification-input]")
            ?.value.trim();
          if (answer) answerClarification(answer);
        }
        return;
      }

      if (target.closest("[data-discover-result-link]")) {
        saveScrollPosition();
      }
    },
    true,
  );

  document.addEventListener(
    "change",
    (event) => {
      const target = event.target;
      if (
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLSelectElement)
      ) {
        return;
      }
      if (target.closest("#command-form") || !activeSearch()) return;
      if (target.dataset.filter && handleManualChange(target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );

  document.addEventListener(
    "input",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target === getQueryInput()) {
        state.error = null;
        state.clarification = null;
        if (state.busy) cancelCurrentSearch();
        renderPanel();
        return;
      }
      if (
        activeSearch() &&
        target.dataset.filter &&
        handleManualInput(target)
      ) {
        event.stopImmediatePropagation();
      }
    },
    true,
  );

  window.addEventListener("popstate", (event) => {
    saveScrollPosition();
    const restored = event.state?.discoverLiveSearch;
    if (restored && typeof restored === "object") {
      Object.assign(state, restored);
    } else {
      Object.assign(state, readUrlState());
    }
    state.response = null;
    state.error = null;
    state.clarification = null;
    cancelCurrentSearch();
    if (state.query) executeSearch({ historyMode: "none" });
    else upgradeBaseUi();
  });

  const app = document.getElementById("app");
  if (app) {
    const observer = new MutationObserver(() => {
      if (state.rendering || state.observerFrame) return;
      state.observerFrame = requestAnimationFrame(async () => {
        state.observerFrame = 0;
        upgradeBaseUi();
        if (
          state.response &&
          !liveResultsIntact(state.response) &&
          state.controller
        ) {
          await renderResults(
            state.response,
            state.sequence,
            state.controller,
          );
        }
      });
    });
    observer.observe(app, { childList: true, subtree: true });
  }

  hydrateFromUrl();
  upgradeBaseUi();
  if (state.query) executeSearch({ historyMode: "replace" });
})();
