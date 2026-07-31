(function installExactLiveTokenAutocomplete() {
  "use strict";

  if (window.__MT_LIVE_TOKEN_AUTOCOMPLETE__) return;
  window.__MT_LIVE_TOKEN_AUTOCOMPLETE__ = true;

  const TOKEN_SELECTOR = '.token[contenteditable]:not([contenteditable="false"])';
  const LISTBOX_ID = "mt-live-token-assist-listbox";
  const RECIPIENT_CONTEXT = "recipients";
  const REMOTE_SEARCH_URL = "/api/nonprofits/search";
  const MAX_RESULTS = 9;
  const MAX_CATALOG_WAIT_MS = 2500;
  const REMOTE_MIN_QUERY_LENGTH = 2;
  const REMOTE_DEBOUNCE_MS = 180;
  const RECIPIENT_CAUSE_SCORE_MINIMUM = 45;
  const AUTO_RESOLVE_DELAY_MS = 650;

  let panel = null;
  let activeToken = null;
  let activeResults = [];
  let activeIndex = -1;
  let catalogWaitStartedAt = 0;
  let catalogRetryTimer = 0;
  let remoteSearchTimer = 0;
  let remoteSearchController = null;
  let renderSequence = 0;
  let selectingSuggestion = false;

  const preparedTokens = new WeakSet();
  const composingTokens = new WeakSet();
  const correctionTimers = new WeakMap();
  const organizationSearchCache = new Map();

  function normalize(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function getAssistApi() {
    return window.MoralTradeInputAssist || null;
  }

  function catalogIsReady() {
    const assist = getAssistApi();
    return Boolean(
      assist &&
        typeof assist.rankSuggestions === "function" &&
        assist.rankSuggestions("priorities", "").length &&
        assist.rankSuggestions("organizations", "").length,
    );
  }

  function tokenContext(token) {
    if (token.getAttribute("data-mt-autocomplete-disabled") === "true") return null;

    const explicitContext = token.getAttribute("data-mt-autocomplete-context");
    if (
      [RECIPIENT_CONTEXT, "priorities", "commitments", "evidence", "exits"].includes(
        explicitContext,
      )
    ) {
      return explicitContext;
    }

    const clause = token.closest(".clause");
    if (!clause) return null;

    const label = normalize(clause.querySelector(".clause-label")?.textContent);
    const tokens = Array.from(clause.querySelectorAll(TOKEN_SELECTOR));
    const index = tokens.indexOf(token);

    if (label === "i offer") return index === 0 ? null : RECIPIENT_CONTEXT;
    if (
      [
        "only if they",
        "money",
        "time",
        "behavior",
        "skill",
        "behavior or commitment",
        "help or service",
        "donation redirect",
        "threshold",
      ].includes(label)
    ) {
      return "commitments";
    }
    if (["proof", "verification"].includes(label)) return "evidence";
    if (label === "if it fails") return "exits";
    return null;
  }

  function ensurePanel() {
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = LISTBOX_ID;
    panel.className = "mt-input-assist-panel";
    panel.hidden = true;
    panel.setAttribute("role", "listbox");
    panel.setAttribute("aria-label", "Suggested completions for this trade term");
    panel.setAttribute("data-mt-live-token-panel", "true");
    panel.addEventListener("pointerdown", (event) => event.preventDefault());
    document.body.appendChild(panel);
    return panel;
  }

  function positionPanel(token) {
    const element = ensurePanel();
    const rect = token.getBoundingClientRect();
    const viewportPadding = 12;
    const width = Math.min(Math.max(rect.width, 330), Math.min(560, window.innerWidth - 24));
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
    );
    let top = rect.bottom + 8;

    element.style.width = `${width}px`;
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;

    const panelRect = element.getBoundingClientRect();
    if (panelRect.bottom > window.innerHeight - viewportPadding && rect.top > panelRect.height + 16) {
      top = rect.top - panelRect.height - 8;
      element.style.top = `${Math.max(viewportPadding, top)}px`;
    }
  }

  function cancelRemoteSearch() {
    window.clearTimeout(remoteSearchTimer);
    remoteSearchTimer = 0;
    if (remoteSearchController) remoteSearchController.abort();
    remoteSearchController = null;
  }

  function closePanel() {
    window.clearTimeout(catalogRetryTimer);
    catalogRetryTimer = 0;
    catalogWaitStartedAt = 0;
    cancelRemoteSearch();
    renderSequence += 1;

    if (panel) {
      panel.hidden = true;
      panel.replaceChildren();
    }
    activeResults = [];
    activeIndex = -1;

    if (activeToken) {
      activeToken.setAttribute("aria-expanded", "false");
      activeToken.removeAttribute("aria-activedescendant");
      activeToken.removeAttribute("aria-busy");
    }
  }

  function setActiveIndex(index) {
    if (!panel || !activeResults.length) return;

    activeIndex = (index + activeResults.length) % activeResults.length;
    const options = panel.querySelectorAll('[role="option"]');
    options.forEach((option, optionIndex) => {
      option.setAttribute("aria-selected", optionIndex === activeIndex ? "true" : "false");
    });

    const activeOption = options[activeIndex];
    if (activeOption && activeToken) {
      activeToken.setAttribute("aria-activedescendant", activeOption.id);
      activeOption.scrollIntoView({ block: "nearest" });
    }
  }

  function suggestionValue(suggestion) {
    return String(suggestion.label || suggestion.value || "").trim();
  }

  function selectSuggestion(index) {
    const token = activeToken;
    const suggestion = activeResults[index];
    if (!token || !suggestion) return;

    selectingSuggestion = true;
    token.textContent = suggestionValue(suggestion);
    token.setAttribute("data-mt-selected-kind", suggestion.kind || "standardized-term");
    if (suggestion.ein) token.setAttribute("data-mt-selected-ein", suggestion.ein);
    else token.removeAttribute("data-mt-selected-ein");
    if (suggestion.source) token.setAttribute("data-mt-selected-source", suggestion.source);
    else token.removeAttribute("data-mt-selected-source");
    token.dispatchEvent(new Event("input", { bubbles: true }));
    token.dispatchEvent(new Event("change", { bubbles: true }));
    selectingSuggestion = false;
    token.focus();
    closePanel();
  }

  function waitForCatalog(token) {
    if (catalogRetryTimer) return;
    if (!catalogWaitStartedAt) catalogWaitStartedAt = Date.now();
    if (Date.now() - catalogWaitStartedAt >= MAX_CATALOG_WAIT_MS) {
      closePanel();
      return;
    }

    catalogRetryTimer = window.setTimeout(() => {
      catalogRetryTimer = 0;
      if (activeToken === token && document.activeElement === token) renderSuggestions(token);
    }, 80);
  }

  function suggestionRank(suggestion) {
    const score = Number(suggestion._rank ?? suggestion.score);
    return Number.isFinite(score) ? score : 0;
  }

  function mergeSuggestions(...groups) {
    const seen = new Set();
    return groups
      .flat()
      .filter((suggestion) => suggestion && suggestionValue(suggestion))
      .sort((a, b) => suggestionRank(b) - suggestionRank(a))
      .filter((suggestion) => {
        const key = normalize(suggestionValue(suggestion));
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX_RESULTS);
  }

  function localSuggestions(context, query, token = activeToken) {
    const assist = getAssistApi();
    if (!assist) return [];

    if (context === RECIPIENT_CONTEXT) {
      const organizations = assist.rankSuggestions("organizations", query).map((suggestion, index) => ({
        ...suggestion,
        kind: "organization",
        source: suggestion.provider || "Curated organization",
        _rank: Number(suggestion.score || 0) + 8 - index / 100,
      }));
      const normalizedQuery = normalize(query);
      const priorities = assist
        .rankSuggestions("priorities", query)
        .filter(
          (suggestion) =>
            !normalizedQuery || Number(suggestion.score || 0) >= RECIPIENT_CAUSE_SCORE_MINIMUM,
        )
        .map((suggestion, index) => ({
          ...suggestion,
          kind: "cause",
          source: "Moral Trade cause areas",
          _rank: Number(suggestion.score || 0) - index / 100,
        }));
      return mergeSuggestions(organizations, priorities);
    }

    const options =
      typeof assist.contextOptionsForElement === "function"
        ? assist.contextOptionsForElement(token, context)
        : {};
    return assist.rankSuggestions(context, query, options).map((suggestion, index) => ({
      ...suggestion,
      kind: context,
      _rank: Number(suggestion.score || 0) - index / 100,
    }));
  }

  function clearCorrectionTimer(token) {
    const timer = correctionTimers.get(token);
    if (timer) window.clearTimeout(timer);
    correctionTimers.delete(token);
  }

  function createTokenResolver(token) {
    const clause = token.closest(".clause");
    if (!clause) return () => token;

    const label = normalize(clause.querySelector(".clause-label")?.textContent);
    const matchingClauses = Array.from(document.querySelectorAll(".clause")).filter(
      (candidate) =>
        normalize(candidate.querySelector(".clause-label")?.textContent) === label,
    );
    const clauseIndex = matchingClauses.indexOf(clause);
    const tokenIndex = Array.from(clause.querySelectorAll(TOKEN_SELECTOR)).indexOf(token);
    const context = tokenContext(token);

    return () => {
      if (token.isConnected) return token;

      const currentClauses = Array.from(document.querySelectorAll(".clause")).filter(
        (candidate) =>
          normalize(candidate.querySelector(".clause-label")?.textContent) === label,
      );
      const currentClause = currentClauses[clauseIndex];
      if (!currentClause) return token;

      const currentTokens = Array.from(currentClause.querySelectorAll(TOKEN_SELECTOR));
      const indexedToken = currentTokens[tokenIndex];
      if (indexedToken && tokenContext(indexedToken) === context) return indexedToken;
      return currentTokens.find((candidate) => tokenContext(candidate) === context) || token;
    };
  }

  function correctToken(token, context) {
    const assist = getAssistApi();
    if (
      !assist ||
      typeof assist.correctElement !== "function" ||
      composingTokens.has(token)
    ) {
      return false;
    }
    const options =
      typeof assist.contextOptionsForElement === "function"
        ? assist.contextOptionsForElement(token, context)
        : {};
    return assist.correctElement(token, context, {
      ...options,
      resolveElement: createTokenResolver(token),
    });
  }

  function scheduleTokenCorrection(token, context) {
    clearCorrectionTimer(token);
    if (!context || composingTokens.has(token)) return;
    const assist = getAssistApi();
    const delay = Number(assist?.autoResolveDelayMs) || AUTO_RESOLVE_DELAY_MS;
    const timer = window.setTimeout(() => {
      correctionTimers.delete(token);
      correctToken(token, context);
    }, delay);
    correctionTimers.set(token, timer);
  }

  function remoteSuggestions(payload) {
    if (!payload || !Array.isArray(payload.results)) return [];
    return payload.results
      .filter((suggestion) => suggestion && typeof suggestion.label === "string")
      .map((suggestion, index) => ({
        label: String(suggestion.label).trim(),
        description: String(suggestion.description || "US tax-exempt organization").trim(),
        aliases: Array.isArray(suggestion.aliases) ? suggestion.aliases : [],
        kind: "organization",
        source: String(suggestion.source || payload.source || "Nonprofit directory"),
        ein: suggestion.ein ? String(suggestion.ein) : null,
        profileUrl: suggestion.profileUrl ? String(suggestion.profileUrl) : null,
        _rank: Number(suggestion.score || 0) + 8 - index / 100,
      }));
  }

  function resultDescription(suggestion) {
    const description = suggestion.description || suggestionValue(suggestion);
    if (suggestion.kind === "organization") return `Organization · ${description}`;
    if (suggestion.kind === "cause") return `Cause area · ${description}`;
    return description;
  }

  function renderPanel(context, results, status = {}) {
    const element = ensurePanel();
    activeResults = results;
    activeIndex = activeResults.length ? 0 : -1;
    element.replaceChildren();

    const heading = document.createElement("div");
    heading.className = "mt-input-assist-heading";
    const title = document.createElement("strong");
    title.textContent =
      context === RECIPIENT_CONTEXT ? "Cause areas and organizations" : "Suggested completions";
    const hint = document.createElement("span");
    hint.textContent = "↑↓ choose · Enter use · Esc close";
    heading.append(title, hint);
    element.appendChild(heading);

    if (!activeResults.length) {
      const empty = document.createElement("p");
      empty.className = "mt-input-assist-empty";
      empty.textContent = status.loading
        ? "Searching nonprofit records…"
        : context === RECIPIENT_CONTEXT
          ? "No matching cause area or organization. Custom text is fine."
          : "No standardized match yet. Custom text is fine.";
      element.appendChild(empty);
    } else {
      activeResults.forEach((suggestion, index) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "mt-input-assist-option";
        option.id = `mt-live-token-assist-option-${index}`;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", index === activeIndex ? "true" : "false");
        option.setAttribute("data-mt-suggestion-kind", suggestion.kind || "standardized-term");

        const label = document.createElement("strong");
        label.textContent = suggestion.label;
        const description = document.createElement("span");
        description.textContent = resultDescription(suggestion);
        option.append(label, description);
        option.addEventListener("pointerenter", () => setActiveIndex(index));
        option.addEventListener("click", () => selectSuggestion(index));
        element.appendChild(option);
      });

      if (status.loading || status.sourceUnavailable) {
        const note = document.createElement("p");
        note.className = "mt-input-assist-empty";
        note.textContent = status.loading
          ? "Searching the broader nonprofit directory…"
          : "Broad nonprofit lookup is temporarily unavailable; curated suggestions and custom text still work.";
        element.appendChild(note);
      }
    }

    element.hidden = false;
    if (activeToken) {
      activeToken.setAttribute("role", "combobox");
      activeToken.setAttribute("aria-autocomplete", "list");
      activeToken.setAttribute("aria-controls", LISTBOX_ID);
      activeToken.setAttribute("aria-expanded", "true");
      if (status.loading) activeToken.setAttribute("aria-busy", "true");
      else activeToken.removeAttribute("aria-busy");
      setActiveIndex(activeIndex);
      positionPanel(activeToken);
    }
  }

  function searchOrganizations(token, query, localResults, sequence) {
    const cacheKey = normalize(query);
    if (!cacheKey || cacheKey.length < REMOTE_MIN_QUERY_LENGTH) return;

    if (organizationSearchCache.has(cacheKey)) {
      if (sequence !== renderSequence || activeToken !== token) return;
      renderPanel(
        RECIPIENT_CONTEXT,
        mergeSuggestions(localResults, organizationSearchCache.get(cacheKey)),
      );
      return;
    }

    cancelRemoteSearch();
    remoteSearchTimer = window.setTimeout(async () => {
      remoteSearchTimer = 0;
      remoteSearchController = new AbortController();

      try {
        const response = await fetch(`${REMOTE_SEARCH_URL}?q=${encodeURIComponent(query)}`, {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          signal: remoteSearchController.signal,
        });
        if (!response.ok) throw new Error(`Nonprofit search returned ${response.status}`);

        const payload = await response.json();
        const results = remoteSuggestions(payload);
        if (payload.sourceUnavailable !== true) organizationSearchCache.set(cacheKey, results);

        if (
          sequence === renderSequence &&
          activeToken === token &&
          document.activeElement === token
        ) {
          renderPanel(RECIPIENT_CONTEXT, mergeSuggestions(localResults, results), {
            sourceUnavailable: payload.sourceUnavailable === true,
          });
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        if (
          sequence === renderSequence &&
          activeToken === token &&
          document.activeElement === token
        ) {
          renderPanel(RECIPIENT_CONTEXT, localResults, { sourceUnavailable: true });
        }
      } finally {
        remoteSearchController = null;
      }
    }, REMOTE_DEBOUNCE_MS);
  }

  function renderSuggestions(token) {
    const context = tokenContext(token);
    activeToken = token;

    if (!context) {
      closePanel();
      return;
    }
    if (!catalogIsReady()) {
      waitForCatalog(token);
      return;
    }

    catalogWaitStartedAt = 0;
    cancelRemoteSearch();
    const sequence = ++renderSequence;
    const query = String(token.textContent || "").trim();
    const localResults = localSuggestions(context, query, token);
    const shouldSearchOrganizations =
      context === RECIPIENT_CONTEXT && normalize(query).length >= REMOTE_MIN_QUERY_LENGTH;

    renderPanel(context, localResults, { loading: shouldSearchOrganizations });
    if (shouldSearchOrganizations) searchOrganizations(token, query, localResults, sequence);
  }

  function prepareToken(token) {
    if (!(token instanceof HTMLElement) || preparedTokens.has(token)) return;
    preparedTokens.add(token);

    const context = tokenContext(token);
    if (!context) return;

    token.setAttribute("data-mt-autocomplete", context);
    token.setAttribute("data-mt-autocomplete-context", context);
    token.setAttribute("data-mt-autocomplete-ready", "true");
    token.setAttribute("aria-autocomplete", "list");
    token.setAttribute("aria-haspopup", "listbox");
    token.setAttribute(
      "title",
      context === RECIPIENT_CONTEXT
        ? "Type a cause area, charity, or organization"
        : "Type to see standardized suggestions",
    );

    token.addEventListener("focus", () => renderSuggestions(token));
    token.addEventListener("input", () => {
      if (!selectingSuggestion) {
        token.removeAttribute("data-mt-selected-kind");
        token.removeAttribute("data-mt-selected-ein");
        token.removeAttribute("data-mt-selected-source");
      }
      if (document.activeElement === token) renderSuggestions(token);
      scheduleTokenCorrection(token, context);
    });
    token.addEventListener("compositionstart", () => {
      composingTokens.add(token);
      clearCorrectionTimer(token);
    });
    token.addEventListener("compositionend", () => {
      composingTokens.delete(token);
      renderSuggestions(token);
      scheduleTokenCorrection(token, context);
    });
    token.addEventListener("keydown", (event) => {
      if (activeToken !== token || !panel || panel.hidden) return;

      if (event.key === "ArrowDown" && activeResults.length) {
        event.preventDefault();
        setActiveIndex(activeIndex + 1);
      } else if (event.key === "ArrowUp" && activeResults.length) {
        event.preventDefault();
        setActiveIndex(activeIndex - 1);
      } else if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        selectSuggestion(activeIndex);
      } else if (event.key === "Tab" && activeIndex >= 0 && (token.textContent || "").trim()) {
        selectSuggestion(activeIndex);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
      }
    });
    token.addEventListener("blur", () => {
      clearCorrectionTimer(token);
      correctToken(token, context);
      window.setTimeout(() => {
        if (activeToken === token && (!panel || !panel.contains(document.activeElement))) closePanel();
      }, 80);
    });

    if (document.activeElement === token) renderSuggestions(token);
  }

  function scan(root) {
    if (root instanceof Element && root.matches(TOKEN_SELECTOR)) prepareToken(root);
    if (!(root instanceof Element || root instanceof Document)) return;
    root.querySelectorAll(TOKEN_SELECTOR).forEach(prepareToken);
  }

  function start() {
    ensurePanel();
    scan(document);

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) scan(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("pointerdown", (event) => {
      if (
        panel &&
        !panel.hidden &&
        event.target !== activeToken &&
        !panel.contains(event.target)
      ) {
        closePanel();
      }
    });
    window.addEventListener("resize", () => {
      if (activeToken && panel && !panel.hidden) positionPanel(activeToken);
    });
    window.addEventListener(
      "scroll",
      () => {
        if (activeToken && panel && !panel.hidden) positionPanel(activeToken);
      },
      { capture: true, passive: true },
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
