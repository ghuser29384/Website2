(function moralTradeInputAssistBootstrap() {
  "use strict";

  if (window.__MT_INPUT_ASSIST_STARTED__) return;
  window.__MT_INPUT_ASSIST_STARTED__ = true;

  const CATALOG_URL = "/moral-trade-input-standards.json";
  const MAX_RESULTS = 7;
  const WEBSITE_PATTERN =
    /\b((?:https?:\/\/|www\.)[^\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:org|com|net|io|edu|gov)(?:\/[^\s<>"']*)?)/gi;
  const TRAILING_PUNCTUATION = /[),.;:!?\]}]+$/;
  const CONTEXT_KEYS = [
    "priorities",
    "commitments",
    "evidence",
    "durations",
    "baselines",
    "exits",
    "organizations",
  ];
  const STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "at",
    "by",
    "for",
    "from",
    "in",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
  ]);

  let catalog = null;
  let activeControl = null;
  let activeResults = [];
  let activeIndex = -1;
  let suggestionPanel = null;
  let hoverCard = null;
  let hoverTimer = 0;
  let hideTimer = 0;

  const preparedControls = new WeakSet();
  const preparedDateControls = new WeakSet();
  const preparedForms = new WeakSet();
  const websitePreviews = new WeakMap();

  function normalize(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function tokens(value) {
    return normalize(value)
      .split(/\s+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  }

  function suggestionValue(suggestion) {
    return String(suggestion.value || suggestion.label || "").trim();
  }

  function searchableText(suggestion) {
    return normalize(
      [
        suggestion.label,
        suggestion.value,
        suggestion.description,
        ...(Array.isArray(suggestion.aliases) ? suggestion.aliases : []),
      ].join(" "),
    );
  }

  function scoreSuggestion(suggestion, query) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return 1;

    const label = normalize(suggestion.label);
    const value = normalize(suggestion.value);
    const aliases = (suggestion.aliases || []).map(normalize);
    const haystack = searchableText(suggestion);
    const queryTokens = tokens(query);
    let score = 0;

    if (label === normalizedQuery) score += 120;
    if (label.startsWith(normalizedQuery)) score += 90;
    if (aliases.some((alias) => alias.startsWith(normalizedQuery))) score += 76;
    if (label.includes(normalizedQuery)) score += 62;
    if (value.includes(normalizedQuery)) score += 46;
    if (aliases.some((alias) => alias.includes(normalizedQuery))) score += 52;

    for (const token of queryTokens) {
      if (label.split(" ").some((word) => word.startsWith(token))) score += 24;
      if (aliases.some((alias) => alias.split(" ").some((word) => word.startsWith(token)))) {
        score += 20;
      }
      if (haystack.includes(token)) score += 8;
    }

    return score;
  }

  function entriesForContext(context) {
    if (!catalog) return [];
    if (context === "search") {
      return [
        ...(catalog.priorities || []),
        ...(catalog.organizations || []),
        ...(catalog.commitments || []),
      ];
    }
    return Array.isArray(catalog[context]) ? catalog[context] : [];
  }

  function rankSuggestions(context, query) {
    return entriesForContext(context)
      .map((suggestion, catalogIndex) => ({
        ...suggestion,
        catalogIndex,
        score: scoreSuggestion(suggestion, query),
      }))
      .filter((suggestion) => !normalize(query) || suggestion.score > 0)
      .sort((a, b) => b.score - a.score || a.catalogIndex - b.catalogIndex)
      .slice(0, MAX_RESULTS);
  }

  function controlDescriptor(control) {
    const explicit = control.getAttribute("data-mt-autocomplete");
    if (explicit) return explicit;

    const labels = [];
    if (control.labels) {
      labels.push(...Array.from(control.labels).map((label) => label.textContent || ""));
    }
    const enclosingLabel = control.closest("label");
    if (enclosingLabel) labels.push(enclosingLabel.textContent || "");

    return [
      control.name,
      control.id,
      control.getAttribute("aria-label"),
      control.getAttribute("placeholder"),
      ...labels,
    ]
      .filter(Boolean)
      .join(" ");
  }

  function inferContext(control) {
    const explicit = normalize(control.getAttribute("data-mt-autocomplete"));
    if (["off", "none", "false"].includes(explicit)) return null;
    if (explicit === "search" || CONTEXT_KEYS.includes(explicit)) return explicit;

    const descriptor = normalize(controlDescriptor(control));

    if (control instanceof HTMLInputElement && control.type === "search") {
      return "search";
    }
    if (/\b(cause|priority|value|category|issue|focus area)\b/.test(descriptor)) {
      return "priorities";
    }
    if (/\b(evidence|proof|verification|verify|receipt|attestation)\b/.test(descriptor)) {
      return "evidence";
    }
    if (/\b(duration|cadence|frequency|term length|action window)\b/.test(descriptor)) {
      return "durations";
    }
    if (/\b(baseline|without a trade|without trade|otherwise|status quo)\b/.test(descriptor)) {
      return "baselines";
    }
    if (/\b(exit|withdraw|cancel|cancellation|pause|end future)\b/.test(descriptor)) {
      return "exits";
    }
    if (
      /\b(organization|organisation|charity|recipient|destination|website|site|nonprofit|fund)\b/.test(
        descriptor,
      )
    ) {
      return "organizations";
    }
    if (
      /\b(commitment|action|offer|request|task|deliverable|promise|pledge|what will|goal)\b/.test(
        descriptor,
      )
    ) {
      return "commitments";
    }
    if (/\b(search|find|query)\b/.test(descriptor)) return "search";
    return null;
  }

  function eligibleControl(control) {
    if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) {
      return false;
    }
    if (control.disabled || control.readOnly) return false;
    if (control instanceof HTMLTextAreaElement) return true;

    const type = (control.type || "text").toLowerCase();
    return ["search", "text", "url"].includes(type);
  }

  function localCalendarDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(new Date());
    const year = parts.find((part) => part.type === "year")?.value || "";
    const month = parts.find((part) => part.type === "month")?.value || "";
    const day = parts.find((part) => part.type === "day")?.value || "";
    return year && month && day ? `${year}-${month}-${day}` : "";
  }

  function prepareForm(form) {
    if (!(form instanceof HTMLFormElement) || preparedForms.has(form)) return;
    preparedForms.add(form);
    form.addEventListener("submit", () => {
      const values = {
        client_local_date: localCalendarDate(),
        client_time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      };
      Object.entries(values).forEach(([name, value]) => {
        let hidden = form.querySelector(`input[type="hidden"][name="${name}"]`);
        if (!hidden) {
          hidden = document.createElement("input");
          hidden.type = "hidden";
          hidden.name = name;
          form.appendChild(hidden);
        }
        hidden.value = value;
      });
    });
  }

  function prepareFutureDateControl(control) {
    if (
      !(control instanceof HTMLInputElement) ||
      control.type !== "date" ||
      preparedDateControls.has(control)
    ) {
      return;
    }
    preparedDateControls.add(control);
    const descriptor = normalize(controlDescriptor(control));
    if (
      /\b(start|due|deadline|expires|expiration|action date|scheduled|schedule date)\b/.test(
        descriptor,
      )
    ) {
      const today = localCalendarDate();
      if (today && (!control.min || control.min < today)) control.min = today;
    }
    if (control.form) prepareForm(control.form);
  }

  function ensureSuggestionPanel() {
    if (suggestionPanel) return suggestionPanel;

    const panel = document.createElement("div");
    panel.className = "mt-input-assist-panel";
    panel.hidden = true;
    panel.setAttribute("role", "listbox");
    panel.setAttribute("aria-label", "Suggested completions");
    panel.addEventListener("pointerdown", (event) => event.preventDefault());
    document.body.appendChild(panel);
    suggestionPanel = panel;
    return panel;
  }

  function positionFloatingElement(element, anchor) {
    const rect = anchor.getBoundingClientRect();
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

  function closeSuggestions() {
    if (!suggestionPanel) return;
    suggestionPanel.hidden = true;
    suggestionPanel.replaceChildren();
    activeResults = [];
    activeIndex = -1;
    if (activeControl) {
      activeControl.setAttribute("aria-expanded", "false");
      activeControl.removeAttribute("aria-activedescendant");
    }
  }

  function selectSuggestion(index) {
    const suggestion = activeResults[index];
    const control = activeControl;
    if (!suggestion || !control) return;

    const value = suggestionValue(suggestion);
    const prototype =
      control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor && descriptor.set) descriptor.set.call(control, value);
    else control.value = value;

    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    control.focus();
    closeSuggestions();
    updateWebsitePreview(control);
  }

  function renderSuggestions(control) {
    const context = inferContext(control);
    const panel = ensureSuggestionPanel();
    activeControl = control;

    if (!context || !catalog) {
      closeSuggestions();
      return;
    }

    activeResults = rankSuggestions(context, control.value);
    activeIndex = activeResults.length ? 0 : -1;
    panel.replaceChildren();

    const heading = document.createElement("div");
    heading.className = "mt-input-assist-heading";
    const title = document.createElement("strong");
    title.textContent = "Suggested completions";
    const hint = document.createElement("span");
    hint.textContent = "↑↓ choose · Enter use · Esc close";
    heading.append(title, hint);
    panel.appendChild(heading);

    if (!activeResults.length) {
      const empty = document.createElement("p");
      empty.className = "mt-input-assist-empty";
      empty.textContent = "No standardized match yet. Custom text is fine.";
      panel.appendChild(empty);
    } else {
      activeResults.forEach((suggestion, index) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "mt-input-assist-option";
        option.id = `mt-input-assist-option-${index}`;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", index === activeIndex ? "true" : "false");
        const label = document.createElement("strong");
        label.textContent = suggestion.label;
        const description = document.createElement("span");
        description.textContent = suggestion.description || suggestionValue(suggestion);
        option.append(label, description);
        option.addEventListener("pointerenter", () => setActiveIndex(index));
        option.addEventListener("click", () => selectSuggestion(index));
        panel.appendChild(option);
      });
    }

    panel.hidden = false;
    control.setAttribute("role", "combobox");
    control.setAttribute("aria-autocomplete", "list");
    control.setAttribute("aria-controls", "mt-input-assist-listbox");
    control.setAttribute("aria-expanded", "true");
    panel.id = "mt-input-assist-listbox";
    setActiveIndex(activeIndex);
    positionFloatingElement(panel, control);
  }

  function setActiveIndex(index) {
    if (!activeResults.length || !suggestionPanel) return;
    activeIndex = (index + activeResults.length) % activeResults.length;
    const options = suggestionPanel.querySelectorAll('[role="option"]');
    options.forEach((option, optionIndex) => {
      option.setAttribute("aria-selected", optionIndex === activeIndex ? "true" : "false");
    });
    const activeOption = options[activeIndex];
    if (activeOption && activeControl) {
      activeControl.setAttribute("aria-activedescendant", activeOption.id);
      activeOption.scrollIntoView({ block: "nearest" });
    }
  }

  function normalizeMentionHref(rawValue) {
    const cleaned = String(rawValue || "").replace(TRAILING_PUNCTUATION, "");
    const candidate = /^https?:\/\//i.test(cleaned)
      ? cleaned
      : `https://${cleaned.replace(/^www\./i, "")}`;
    try {
      const url = new URL(candidate);
      return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
    } catch {
      return null;
    }
  }

  function extractWebsiteMentions(value) {
    const source = String(value || "");
    const found = [];
    const seen = new Set();
    WEBSITE_PATTERN.lastIndex = 0;

    let match;
    while ((match = WEBSITE_PATTERN.exec(source))) {
      if (match.index > 0 && source[match.index - 1] === "@") continue;
      const href = normalizeMentionHref(match[1]);
      if (!href) continue;
      const key = href.replace(/\/$/, "").toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ href, text: match[1].replace(TRAILING_PUNCTUATION, "") });
      if (found.length >= 3) break;
    }
    return found;
  }

  function findDonationRoute(href) {
    if (!catalog || !Array.isArray(catalog.organizations)) return null;
    let url;
    try {
      url = new URL(href);
    } catch {
      return null;
    }
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const path = url.pathname.toLowerCase();

    return (
      catalog.organizations.find((organization) => {
        const candidates = [organization.website, organization.donationRoute]
          .filter(Boolean)
          .map((candidate) => {
            try {
              return new URL(candidate);
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        return candidates.some((candidate) => {
          const candidateHost = candidate.hostname.replace(/^www\./, "").toLowerCase();
          if (host !== candidateHost) return false;
          if (host !== "every.org") return true;
          const candidatePath = candidate.pathname.replace(/\/$/, "").toLowerCase();
          return !candidatePath || path.startsWith(candidatePath);
        });
      }) || null
    );
  }

  function ensureHoverCard() {
    if (hoverCard) return hoverCard;

    const card = document.createElement("aside");
    card.className = "mt-donation-hover-card";
    card.hidden = true;
    card.setAttribute("role", "tooltip");
    card.addEventListener("pointerenter", () => window.clearTimeout(hideTimer));
    card.addEventListener("pointerleave", scheduleHideHoverCard);
    document.body.appendChild(card);
    hoverCard = card;
    return card;
  }

  function hideHoverCard() {
    window.clearTimeout(hoverTimer);
    if (hoverCard) hoverCard.hidden = true;
  }

  function scheduleHideHoverCard() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hideHoverCard, 120);
  }

  function showHoverCard(anchor, mention) {
    const card = ensureHoverCard();
    const route = findDonationRoute(mention.href);
    card.replaceChildren();

    const kicker = document.createElement("span");
    kicker.className = "mt-donation-hover-kicker";
    kicker.textContent = route ? "Verified donation route" : "Website link";
    const title = document.createElement("strong");
    title.textContent = route ? route.label : new URL(mention.href).hostname.replace(/^www\./, "");
    const description = document.createElement("p");
    description.textContent = route
      ? `${route.provider || "External provider"} opens the recipient's donation page. Moral Trade does not take custody of the gift.`
      : "Moral Trade has not verified a direct donation route for this site. The website link still opens normally.";
    const actions = document.createElement("div");
    actions.className = "mt-donation-hover-actions";

    const websiteLink = document.createElement("a");
    websiteLink.href = mention.href;
    websiteLink.target = "_blank";
    websiteLink.rel = "noopener noreferrer";
    websiteLink.textContent = "Open website";
    actions.appendChild(websiteLink);

    const routeLink = document.createElement("a");
    routeLink.href = route && route.donationRoute ? route.donationRoute : "/donate";
    if (route && route.donationRoute) {
      routeLink.target = "_blank";
      routeLink.rel = "noopener noreferrer";
    }
    routeLink.className = "mt-donation-hover-primary";
    routeLink.textContent = route ? "Donate through verified route" : "Browse reviewed routes";
    actions.appendChild(routeLink);

    card.append(kicker, title, description, actions);
    card.hidden = false;
    positionFloatingElement(card, anchor);
  }

  function attachHoverCard(anchor, mention) {
    anchor.addEventListener("pointerenter", () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => showHoverCard(anchor, mention), 500);
    });
    anchor.addEventListener("pointerleave", () => {
      window.clearTimeout(hoverTimer);
      scheduleHideHoverCard();
    });
    anchor.addEventListener("focus", () => showHoverCard(anchor, mention));
    anchor.addEventListener("blur", scheduleHideHoverCard);
  }

  function websitePreviewHost(control) {
    const labelledField = control.closest("label");
    return labelledField && labelledField.parentElement ? labelledField : control;
  }

  function updateWebsitePreview(control) {
    const mentions = extractWebsiteMentions(control.value);
    let preview = websitePreviews.get(control);

    if (!mentions.length) {
      if (preview) preview.remove();
      websitePreviews.delete(control);
      return;
    }

    if (!preview || !preview.isConnected) {
      preview = document.createElement("div");
      preview.className = "mt-website-mention-preview";
      preview.setAttribute("aria-label", "Linked websites in this field");
      const host = websitePreviewHost(control);
      host.insertAdjacentElement("afterend", preview);
      websitePreviews.set(control, preview);
    }

    preview.replaceChildren();
    const label = document.createElement("span");
    label.className = "mt-website-mention-label";
    label.textContent = mentions.length === 1 ? "Linked website" : "Linked websites";
    preview.appendChild(label);

    mentions.forEach((mention) => {
      const anchor = document.createElement("a");
      anchor.href = mention.href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = mention.text;
      attachHoverCard(anchor, mention);
      preview.appendChild(anchor);
    });
  }

  function prepareControl(control) {
    if (!eligibleControl(control) || preparedControls.has(control)) return;
    preparedControls.add(control);

    const context = inferContext(control);
    if (context) {
      control.setAttribute("data-mt-autocomplete-context", context);
      control.setAttribute("data-mt-autocomplete-ready", "true");
      control.setAttribute("aria-autocomplete", "list");
      control.setAttribute("aria-haspopup", "listbox");
    }

    control.addEventListener("focus", () => {
      if (inferContext(control)) renderSuggestions(control);
      updateWebsitePreview(control);
    });
    control.addEventListener("input", () => {
      if (document.activeElement === control && inferContext(control)) renderSuggestions(control);
      updateWebsitePreview(control);
    });
    control.addEventListener("keydown", (event) => {
      if (activeControl !== control || !suggestionPanel || suggestionPanel.hidden) return;

      if (event.key === "ArrowDown" && activeResults.length) {
        event.preventDefault();
        setActiveIndex(activeIndex + 1);
      } else if (event.key === "ArrowUp" && activeResults.length) {
        event.preventDefault();
        setActiveIndex(activeIndex - 1);
      } else if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        selectSuggestion(activeIndex);
      } else if (event.key === "Tab" && activeIndex >= 0 && control.value.trim()) {
        selectSuggestion(activeIndex);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeSuggestions();
      }
    });
    control.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (
          activeControl === control &&
          (!suggestionPanel || !suggestionPanel.contains(document.activeElement))
        ) {
          closeSuggestions();
        }
      }, 80);
    });

    updateWebsitePreview(control);

    if (context && document.activeElement === control) {
      renderSuggestions(control);
    }
  }

  function scan(root) {
    if (root instanceof HTMLFormElement) prepareForm(root);
    if (root instanceof HTMLInputElement && root.type === "date") {
      prepareFutureDateControl(root);
    }
    if (root instanceof Element && root.matches("input, textarea")) prepareControl(root);
    if (!(root instanceof Element || root instanceof Document)) return;
    root.querySelectorAll("input, textarea").forEach(prepareControl);
    root.querySelectorAll('input[type="date"]').forEach(prepareFutureDateControl);
    root.querySelectorAll("form").forEach(prepareForm);
  }

  function start() {
    ensureSuggestionPanel();
    ensureHoverCard();
    scan(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) scan(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("pointerdown", (event) => {
      if (
        suggestionPanel &&
        !suggestionPanel.hidden &&
        event.target !== activeControl &&
        !suggestionPanel.contains(event.target)
      ) {
        closeSuggestions();
      }
    });
    window.addEventListener("resize", () => {
      if (activeControl && suggestionPanel && !suggestionPanel.hidden) {
        positionFloatingElement(suggestionPanel, activeControl);
      }
    });
    window.addEventListener(
      "scroll",
      () => {
        if (activeControl && suggestionPanel && !suggestionPanel.hidden) {
          positionFloatingElement(suggestionPanel, activeControl);
        }
        hideHoverCard();
      },
      { capture: true, passive: true },
    );
  }

  window.MoralTradeInputAssist = {
    extractWebsiteMentions,
    findDonationRoute,
    inferContext,
    normalize,
    rankSuggestions,
    scoreSuggestion,
  };

  fetch(CATALOG_URL, { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error(`Input standards returned ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      catalog = payload && typeof payload === "object" ? payload : {};
      CONTEXT_KEYS.forEach((key) => {
        if (!Array.isArray(catalog[key])) catalog[key] = [];
      });
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
      } else {
        start();
      }
    })
    .catch((error) => {
      console.warn("[Moral Trade] Contextual autocomplete is unavailable.", error);
    });
})();
