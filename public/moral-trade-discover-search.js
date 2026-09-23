(() => {
  "use strict";

  // One read-only endpoint owns initial browsing, filters, search and pagination.
  // There is no demonstration inventory or second renderer to fall back to.
  const form = document.getElementById("command-form");
  if (!form) return;
  const input = document.getElementById("command-input");
  const kind = document.getElementById("offer-kind");
  const maximum = document.getElementById("maximum-offer");
  const results = document.getElementById("trade-results");
  const region = document.getElementById("results");
  const status = document.getElementById("search-status");
  const count = document.getElementById("result-count");
  const constraints = document.getElementById("search-constraints");
  const clarification = document.getElementById("search-clarification");
  const pager = document.getElementById("result-pages");
  const previous = document.getElementById("previous-page");
  const next = document.getElementById("next-page");
  const kinds = new Set(["all", "individual", "co-fund"]);
  let state;
  let sequence = 0;
  let controller = null;

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  function link(text, href, className) {
    const element = node("a", text, className);
    element.href = href;
    return element;
  }

  function button(text, action, className = "outline-btn") {
    const element = node("button", text, className);
    element.type = "button";
    element.addEventListener("click", action);
    return element;
  }

  function cents(value) {
    if (value === null || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 100000000
      ? Math.round(number * 100) : null;
  }

  function readUrl() {
    const params = new URLSearchParams(location.search);
    const csv = (name) => [...new Set((params.get(name) || "").split(",").filter(Boolean))];
    return {
      query: (params.get("q") || params.get("query") || "").slice(0, 500),
      normalizedQuery: (params.get("nq") || "").slice(0, 500),
      offerKind: kinds.has(params.get("offerKind")) ? params.get("offerKind") : "all",
      excludedConstraints: csv("exclude"),
      page: Math.min(100, Math.max(1, Math.floor(Number(params.get("page")) || 1))),
      manual: {
        causes: csv("causeFilter"),
        verifiedOnly: params.get("verified") === "1",
        maximumOfferAmountCents: cents(params.get("max")),
        minimumReturnAmountCents: cents(params.get("minReturn")),
        offerTypes: csv("offerType"),
        returnTypes: csv("returnType"),
        recipient: (params.get("recipient") || "").slice(0, 160),
        evidence: (params.get("evidence") || "").slice(0, 160),
        flexibilities: csv("flexibility"),
        deadlineBefore: params.get("deadline") || null,
      },
    };
  }

  function syncControls() {
    input.value = state.query;
    kind.value = state.offerKind;
    maximum.value = state.manual.maximumOfferAmountCents === null
      ? "" : String(state.manual.maximumOfferAmountCents / 100);
  }

  function syncUrl(mode) {
    if (mode === "none") return;
    const url = new URL(location.href);
    const params = new URLSearchParams();
    // Keep old bookmarked list URLs valid, but never restore retired views.
    params.set("domain", "offers");
    params.set("view", "list");
    const put = (key, value) => {
      if (value !== "" && value !== null && value !== undefined) params.set(key, String(value));
    };
    put("q", state.query);
    if (state.normalizedQuery !== state.query) put("nq", state.normalizedQuery);
    if (state.offerKind !== "all") put("offerKind", state.offerKind);
    if (state.page > 1) put("page", state.page);
    put("exclude", state.excludedConstraints.join(","));
    const manual = state.manual;
    put("causeFilter", manual.causes.join(","));
    if (manual.verifiedOnly) put("verified", "1");
    if (manual.maximumOfferAmountCents !== null) put("max", manual.maximumOfferAmountCents / 100);
    if (manual.minimumReturnAmountCents !== null) put("minReturn", manual.minimumReturnAmountCents / 100);
    put("offerType", manual.offerTypes.join(","));
    put("returnType", manual.returnTypes.join(","));
    put("recipient", manual.recipient);
    put("evidence", manual.evidence);
    put("flexibility", manual.flexibilities.join(","));
    put("deadline", manual.deadlineBefore);
    url.search = params.toString();
    url.hash = "";
    const target = `${url.pathname}${url.search}`;
    if (mode === "push" && target !== `${location.pathname}${location.search}`) {
      history.pushState(null, "", target);
    } else {
      history.replaceState(null, "", target);
    }
  }

  function clearSearch() {
    controller?.abort();
    history.pushState(null, "", location.pathname);
    state = readUrl();
    syncControls();
    executeSearch("replace");
  }

  function submitFields() {
    if (!form.reportValidity()) return;
    const query = input.value.trim();
    if (query !== state.query) {
      state.normalizedQuery = "";
      state.excludedConstraints = [];
    }
    state.query = query;
    state.offerKind = kind.value;
    state.manual.maximumOfferAmountCents = cents(maximum.value);
    state.page = 1;
    executeSearch("push");
  }

  function safeHref(value) {
    if (typeof value !== "string") return null;
    try {
      const url = new URL(value, location.origin);
      const trustedOrigins = new Set([location.origin, "https://moraltrade.org", "https://www.moraltrade.org"]);
      if (!trustedOrigins.has(url.origin) || url.username || url.password) return null;
      const offerPath = /^\/offers\/[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
      const coFundPath = url.pathname === "/moral-goods-group-buying";
      if (!offerPath.test(url.pathname) && !coFundPath) return null;
      if (/^\/offers\/(?:examples?|demo|null|undefined)$/.test(url.pathname)) return null;
      // Stay on the current origin so authentication and preview links are not lost.
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }

  function validOffer(item) {
    const strings = ["id", "title", "cause", "status", "providerName", "providerRole", "evidenceLabel", "completionLabel", "offerFlexibility", "returnFlexibility"];
    return item && item.isWorkedExample !== true && item.source !== "example" && item.kind === "offer" && ["individual", "co-fund"].includes(item.offerKind) &&
      strings.every((key) => typeof item[key] === "string") && item.id.trim() && item.title.trim() &&
      [item.youOffer, item.youGet].every((side) => Array.isArray(side) && side.length > 0 && side.every((term) => typeof term === "string" && term.trim())) &&
      safeHref(item.href);
  }

  function exchangeSide(item, side) {
    const section = node("section", undefined, "exchange-side");
    section.dataset.exchangeSide = side;
    const label = side === "offer" ? "You provide" : "Counterparty provides";
    section.setAttribute("aria-label", label);
    const heading = node("div", undefined, "exchange-side-head");
    heading.append(node("span", label, "exchange-label"), node("span", side === "offer" ? item.offerFlexibility : item.returnFlexibility, "exchange-flexibility"));
    const list = node("ul", undefined, "exchange-obligations");
    for (const term of side === "offer" ? item.youOffer : item.youGet) list.append(node("li", term));
    section.append(heading, list);
    return section;
  }

  function renderOffer(item) {
    const article = node("article", undefined, "trade-row");
    article.dataset.liveRecord = "true";
    article.dataset.rowId = item.id;
    article.dataset.offerKind = item.offerKind;
    const href = safeHref(item.href);
    const header = node("div", undefined, "trade-row-header");
    const title = node("h3");
    title.append(link(item.title, href));
    header.append(title, node("span", item.offerKind === "co-fund" ? "Co-Fund" : "Individual trade", "trade-kind"));
    const exchange = node("div", undefined, "exchange-grid");
    exchange.append(exchangeSide(item, "offer"), exchangeSide(item, "return"));
    const details = node("div", undefined, "trade-details");
    const facts = node("dl", undefined, "trade-facts");
    for (const [label, value] of [
      ["Counterparty", item.providerName || "See listing"],
      ["Evidence", item.evidenceLabel || "Not specified; review the listing"],
      ["Timing", item.completionLabel || "Not specified; review the listing"],
      ["Review state", item.status || "Not specified"],
    ]) {
      const row = node("div");
      row.append(node("dt", label), node("dd", value));
      facts.append(row);
    }
    const terms = link("Review trade", href, "primary-btn");
    terms.setAttribute("aria-label", `Review trade: ${item.title}`);
    terms.dataset.discoverResultLink = "true";
    details.append(facts, terms);
    article.append(header, node("p", item.cause, "trade-meta"), exchange, details);
    return article;
  }

  function showPanel(title, message, actions = []) {
    const panel = node("div", undefined, "state-panel");
    panel.append(node("h3", title), node("p", message));
    const row = node("div", undefined, "state-actions");
    row.append(...actions);
    if (actions.length) panel.append(row);
    results.replaceChildren(panel);
  }

  function removeConstraint(key) {
    const arrayFields = [
      ["manual-cause:", "causes"], ["manual-offer-type:", "offerTypes"],
      ["manual-return-type:", "returnTypes"], ["manual-flexibility:", "flexibilities"],
    ];
    const arrayField = arrayFields.find(([prefix]) => key.startsWith(prefix));
    const scalarFields = {
      "manual-verified": ["verifiedOnly", false],
      "manual-offer-max": ["maximumOfferAmountCents", null],
      "manual-return-min": ["minimumReturnAmountCents", null],
      "manual-recipient": ["recipient", ""],
      "manual-evidence": ["evidence", ""],
      "manual-deadline": ["deadlineBefore", null],
    };
    if (arrayField) {
      const [prefix, field] = arrayField;
      state.manual[field] = state.manual[field].filter((entry) => entry !== key.slice(prefix.length));
    } else if (Object.hasOwn(scalarFields, key)) {
      const [field, value] = scalarFields[key];
      state.manual[field] = value;
    } else {
      state.excludedConstraints = [...new Set([...state.excludedConstraints, key])];
      if (key === "offer-kind") state.offerKind = "all";
    }
    state.page = 1;
    syncControls();
    executeSearch("push");
  }

  function renderConstraints(items) {
    constraints.replaceChildren();
    for (const item of items || []) {
      if (typeof item.key !== "string" || typeof item.label !== "string" || item.key === "domain") continue;
      const control = button(`${item.label} ×`, () => removeConstraint(item.key));
      control.setAttribute("aria-label", `Remove ${item.label}`);
      constraints.append(control);
    }
  }

  function showClarification(definition) {
    clarification.hidden = false;
    clarification.replaceChildren(node("p", definition.question || "Please make the amount or direction of the exchange more specific."));
    const actions = node("div", undefined, "clarification-actions");
    // Preserve the original query. Only a user's explicit answer may change its interpretation.
    if (definition.field === "amount" && Array.isArray(definition.options)) {
      for (const answer of definition.options.filter((value) => ["Maximum", "Minimum", "Exact amount"].includes(value))) {
        actions.append(button(answer, () => {
          const phrase = answer === "Maximum" ? "under" : answer === "Minimum" ? "at least" : "exactly";
          state.normalizedQuery = state.query.replace(/\bfor\s+(\$\s*[\d,.]+)/i, `${phrase} $1`);
          if (state.normalizedQuery === state.query) {
            status.textContent = "Edit the search to specify the maximum, minimum, or exact amount.";
            input.focus();
            return;
          }
          state.page = 1;
          executeSearch("push");
        }));
      }
    }
    actions.append(button("Edit search", () => input.focus()));
    clarification.append(actions);
  }

  async function executeSearch(historyMode = "push") {
    controller?.abort();
    controller = new AbortController();
    const current = controller;
    const requestNumber = ++sequence;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; current.abort(); }, 20000);
    syncUrl(historyMode);
    region.setAttribute("aria-busy", "true");
    status.textContent = "Checking current listings…";
    status.setAttribute("role", "status");
    count.textContent = "";
    clarification.hidden = true;
    clarification.replaceChildren();
    constraints.replaceChildren();
    pager.hidden = true;
    results.replaceChildren();
    try {
      const response = await fetch("/api/discover/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        signal: current.signal,
        body: JSON.stringify({ ...state, domain: "offers", sort: "best-fit" }),
      });
      if (!response.ok) throw new Error("retrieval");
      const data = await response.json();
      if (requestNumber !== sequence) return;
      if (!data || data.ok !== true || !Array.isArray(data.items) || !["offers", "people", "pools"].includes(data.domain)) throw new Error("contract");
      renderConstraints(data.constraints);
      if (data.domain !== "offers") {
        status.textContent = "Discover now lists trades, not people or standalone funding pools.";
        showPanel("Search for an exchange", "Describe what you can provide or the outcome you want. The former People and Pools views are not available on this page.", [button("Clear search", clearSearch), link("Post a trade", "/trades/new", "primary-btn")]);
        return;
      }
      if (data.clarification) {
        status.textContent = "One detail needs clarification before checking listings.";
        showClarification(data.clarification);
        return;
      }
      const availability = data.sourceStatus?.offers;
      if (!["live", "partial", "unavailable"].includes(availability)) throw new Error("contract");
      if (availability === "unavailable") {
        status.textContent = "Current availability could not be checked.";
        showPanel("Listings are temporarily unavailable", "This is not a zero-result search. We could not read the current trade directory; no example listings have been substituted.", [button("Retry", () => executeSearch("none"))]);
        return;
      }
      if (!data.items.every(validOffer) || new Set(data.items.map((item) => item.id)).size !== data.items.length || !Number.isSafeInteger(data.total) || data.total < data.items.length) throw new Error("contract");
      status.textContent = availability === "partial"
        ? "Only part of the trade directory could be checked. Results below are from the available source; other listings may be missing."
        : "Current listings checked. Review each trade for its latest availability and conditions.";
      if (data.items.length) {
        results.replaceChildren(...data.items.map(renderOffer));
        const amount = data.total === 1 ? "1 matching trade" : `${data.total} matching trades`;
        count.textContent = data.total > data.items.length ? `Showing ${data.items.length} of ${amount}` : amount;
        if (availability === "partial") count.textContent += " · partial directory";
      } else if (data.total > 0) {
        count.textContent = `${data.total} matching ${data.total === 1 ? "trade" : "trades"}${availability === "partial" ? " · partial directory" : ""}`;
        showPanel("No trades on this page", "The listings may have changed since this page was saved. Return to the first page without changing your search or filters.", [button("First page", () => { state.page = 1; executeSearch("push"); })]);
      } else {
        count.textContent = availability === "partial" ? "No matches in the available source" : "0 matching trades";
        showPanel(
          availability === "partial" ? "No matches in the available listings" : state.query || data.constraints?.some((item) => item.key !== "domain") ? "No current trades match" : "No current trades to show",
          availability === "partial" ? "Some listing sources are unavailable. Retry before concluding that there is no suitable trade."
            : "Try a different search, post the exchange you want to make, or invite someone to trade. Worked examples are kept separate from available listings.",
          [button(availability === "partial" ? "Retry" : "Clear search", availability === "partial" ? () => executeSearch("none") : clearSearch), link("Post a trade", "/trades/new", "primary-btn"), link("Invite a counterparty", "/invite", "outline-btn")],
        );
      }
      previous.disabled = state.page <= 1;
      next.disabled = data.hasMore !== true;
      pager.hidden = state.page <= 1 && data.hasMore !== true;
      document.getElementById("page-label").textContent = `Page ${state.page}`;
    } catch {
      if (requestNumber !== sequence) return;
      status.setAttribute("role", "alert");
      status.textContent = timedOut ? "The directory took too long to respond." : "Current listings could not be loaded.";
      count.textContent = "";
      results.replaceChildren();
      showPanel("Unable to check current trades", "Your search is still here. Retry to check live records. No agreement or payment has been created.", [button("Retry", () => executeSearch("none"))]);
    } finally {
      clearTimeout(timer);
      if (requestNumber === sequence) region.setAttribute("aria-busy", "false");
    }
  }

  form.addEventListener("submit", (event) => { event.preventDefault(); submitFields(); });
  kind.addEventListener("change", submitFields);
  maximum.addEventListener("change", submitFields);
  document.getElementById("clear-search").addEventListener("click", clearSearch);
  previous.addEventListener("click", () => { state.page = Math.max(1, state.page - 1); executeSearch("push"); });
  next.addEventListener("click", () => { state.page += 1; executeSearch("push"); });
  window.addEventListener("popstate", () => { state = readUrl(); syncControls(); executeSearch("none"); });
  window.addEventListener("pageshow", (event) => { if (event.persisted) executeSearch("none"); });

  const initial = new URLSearchParams(location.search);
  if ((initial.has("view") && initial.get("view") !== "list") || (initial.has("domain") && initial.get("domain") !== "offers")) {
    const notice = document.getElementById("legacy-notice");
    notice.hidden = false;
    notice.textContent = "The previous graph, People, and Pools views have been retired. Discover now shows current trades in one list.";
  }
  state = readUrl();
  syncControls();
  window.__moralTradeDiscoverSearchLoaded = true;
  executeSearch("replace");
})();
