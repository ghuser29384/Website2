(function installExactLiveTokenAutocomplete() {
  "use strict";

  if (window.__MT_LIVE_TOKEN_AUTOCOMPLETE__) return;
  window.__MT_LIVE_TOKEN_AUTOCOMPLETE__ = true;

  const TOKEN_SELECTOR = '.token[contenteditable]:not([contenteditable="false"])';
  const LISTBOX_ID = "mt-live-token-assist-listbox";
  const MAX_CATALOG_WAIT_MS = 2500;

  let panel = null;
  let activeToken = null;
  let activeResults = [];
  let activeIndex = -1;
  let catalogWaitStartedAt = 0;
  let catalogRetryTimer = 0;

  const preparedTokens = new WeakSet();

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
        assist.rankSuggestions("priorities", "").length,
    );
  }

  function tokenContext(token) {
    if (token.getAttribute("data-mt-autocomplete-disabled") === "true") return null;

    const explicitContext = token.getAttribute("data-mt-autocomplete-context");
    if (["priorities", "commitments", "evidence", "exits"].includes(explicitContext)) {
      return explicitContext;
    }

    const clause = token.closest(".clause");
    if (!clause) return null;

    const label = normalize(clause.querySelector(".clause-label")?.textContent);
    const tokens = Array.from(clause.querySelectorAll(TOKEN_SELECTOR));
    const index = tokens.indexOf(token);

    if (label === "i offer") return index === 0 ? null : "priorities";
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
    const width = Math.min(Math.max(rect.width, 300), Math.min(520, window.innerWidth - 24));
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

  function closePanel() {
    window.clearTimeout(catalogRetryTimer);
    catalogRetryTimer = 0;
    catalogWaitStartedAt = 0;

    if (panel) {
      panel.hidden = true;
      panel.replaceChildren();
    }
    activeResults = [];
    activeIndex = -1;

    if (activeToken) {
      activeToken.setAttribute("aria-expanded", "false");
      activeToken.removeAttribute("aria-activedescendant");
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

    token.textContent = suggestionValue(suggestion);
    token.dispatchEvent(new Event("input", { bubbles: true }));
    token.dispatchEvent(new Event("change", { bubbles: true }));
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
    const assist = getAssistApi();
    activeResults = assist.rankSuggestions(context, token.textContent || "");
    activeIndex = activeResults.length ? 0 : -1;

    const element = ensurePanel();
    element.replaceChildren();

    const heading = document.createElement("div");
    heading.className = "mt-input-assist-heading";
    const title = document.createElement("strong");
    title.textContent = "Suggested completions";
    const hint = document.createElement("span");
    hint.textContent = "↑↓ choose · Enter use · Esc close";
    heading.append(title, hint);
    element.appendChild(heading);

    if (!activeResults.length) {
      const empty = document.createElement("p");
      empty.className = "mt-input-assist-empty";
      empty.textContent = "No standardized match yet. Custom text is fine.";
      element.appendChild(empty);
    } else {
      activeResults.forEach((suggestion, index) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "mt-input-assist-option";
        option.id = `mt-live-token-assist-option-${index}`;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", index === activeIndex ? "true" : "false");

        const label = document.createElement("strong");
        label.textContent = suggestion.label;
        const description = document.createElement("span");
        description.textContent = suggestion.description || suggestionValue(suggestion);
        option.append(label, description);
        option.addEventListener("pointerenter", () => setActiveIndex(index));
        option.addEventListener("click", () => selectSuggestion(index));
        element.appendChild(option);
      });
    }

    element.hidden = false;
    token.setAttribute("role", "combobox");
    token.setAttribute("aria-autocomplete", "list");
    token.setAttribute("aria-controls", LISTBOX_ID);
    token.setAttribute("aria-expanded", "true");
    setActiveIndex(activeIndex);
    positionPanel(token);
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
    token.setAttribute("title", "Type to see standardized suggestions");

    token.addEventListener("focus", () => renderSuggestions(token));
    token.addEventListener("input", () => {
      if (document.activeElement === token) renderSuggestions(token);
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
