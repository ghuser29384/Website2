(() => {
  "use strict";

  if (window.__moralTradeSmartQueryLoaded) return;
  window.__moralTradeSmartQueryLoaded = true;

  const STORAGE_KEY = "moral-trade:discover-smart-query:v1";
  let bypassNextSubmit = false;
  let busy = false;

  function getForm() {
    return document.getElementById("command-form");
  }

  function getQueryInput(form) {
    return form?.querySelector('input[name="q"], input[name="command"], #command-input');
  }

  function getSubmitButton(form) {
    return form?.querySelector('button[type="submit"]');
  }

  function clearGenerated() {
    document
      .querySelectorAll("[data-smart-query-generated]")
      .forEach((element) => element.remove());
  }

  function rememberInterpretation(interpretation) {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          query: interpretation.originalQuery,
          parsedConstraintCount: interpretation.parsedConstraintCount,
          confidence: interpretation.confidence,
          reasonCodes: interpretation.reasonCodes,
        }),
      );
    } catch {
      // Discover remains functional when storage is blocked.
    }
  }

  function storedInterpretation() {
    try {
      const value = sessionStorage.getItem(STORAGE_KEY);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  function applyStoredSummary() {
    const stored = storedInterpretation();
    const input = getQueryInput(getForm());
    const currentQuery = (input?.value || new URLSearchParams(location.search).get("q") || "").trim();
    if (!stored || !currentQuery || stored.query !== currentQuery) return;

    const label = document.querySelector(".parsed-state-label");
    if (label && Number.isFinite(stored.parsedConstraintCount)) {
      label.textContent = `PARSED CONSTRAINTS · ${stored.parsedConstraintCount}`;
    }

    document.querySelectorAll(".confidence-banner").forEach((banner) => {
      if (/search interpretation uncertain/i.test(banner.textContent || "")) banner.remove();
    });
  }

  function setBusy(form, isBusy) {
    busy = isBusy;
    form?.setAttribute("aria-busy", String(isBusy));
    const button = getSubmitButton(form);
    if (!button) return;
    if (isBusy) {
      button.dataset.smartQueryOriginalText = button.textContent || "Run search →";
      button.textContent = "Interpreting…";
      button.disabled = true;
    } else {
      button.textContent = button.dataset.smartQueryOriginalText || "Run search →";
      button.disabled = false;
    }
  }

  function actionButton(label, handler, primary = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.border = primary ? "1px solid #244bf4" : "1px solid #9da7bf";
    button.style.background = primary ? "#244bf4" : "#ffffff";
    button.style.color = primary ? "#ffffff" : "#17203a";
    button.style.padding = "10px 14px";
    button.style.fontWeight = "800";
    button.style.cursor = "pointer";
    button.addEventListener("click", handler);
    return button;
  }

  function renderClarification(form, clarification, onAnswer) {
    clearGenerated();
    const panel = document.createElement("div");
    panel.className = "confidence-banner";
    panel.dataset.smartQueryGenerated = "true";
    panel.dataset.testid = "discover-smart-query-clarification";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");
    panel.style.display = "grid";
    panel.style.gap = "10px";
    panel.style.marginTop = "14px";

    const title = document.createElement("strong");
    title.textContent = "One detail changes the results.";
    const question = document.createElement("span");
    question.textContent = clarification.question;
    panel.append(title, question);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.flexWrap = "wrap";
    actions.style.gap = "8px";

    if (Array.isArray(clarification.options) && clarification.options.length) {
      clarification.options.forEach((option, index) => {
        actions.append(actionButton(option, () => onAnswer(option), index === 0));
      });
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.autocomplete = "off";
      input.setAttribute("aria-label", "Clarification answer");
      input.style.minWidth = "240px";
      input.style.padding = "10px 12px";
      const submit = actionButton(
        "Continue search",
        () => input.value.trim() && onAnswer(input.value.trim()),
        true,
      );
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        if (input.value.trim()) onAnswer(input.value.trim());
      });
      actions.append(input, submit);
      queueMicrotask(() => input.focus());
    }

    actions.append(actionButton("Keep editing", clearGenerated));
    panel.append(actions);
    form.insertAdjacentElement("afterend", panel);
  }

  function isCoFundQuery(query) {
    return /\bco[- ]?funds?\b|\bgroup[- ]buy(?:ing)?\b|\bcollective(?:ly)? fund(?:ing)? (?:an? )?(?:offer|trade)\b/.test(String(query || "").toLowerCase());
  }

  function isStandalonePoolQuery(query) {
    return /\b(pool|pools|threshold|conditional funding)\b|\b(?:dominant[- ]assurance(?: contracts?)?|assurance contracts?)\b/.test(String(query || "").toLowerCase());
  }

  function inferDiscoverDomain(interpretation, target) {
    const targetUrl = new URL(target, location.origin);
    const fromTarget = targetUrl.searchParams.get("domain");
    const query = interpretation.normalizedQuery || "";
    const facets = interpretation.facets || {};
    if (isCoFundQuery(query)) return "offers";
    if (Array.isArray(facets.actionTypes) && facets.actionTypes.includes("pool")) return "pools";
    if (isStandalonePoolQuery(query)) {
      return "pools";
    }
    if (
      (Array.isArray(facets.participantKinds) && facets.participantKinds.length) ||
      /\b(person|people|member|members|participant|participants|counterparty|counterparties|who)\b/.test(query)
    ) {
      return "people";
    }
    return ["offers", "people", "pools"].includes(fromTarget) ? fromTarget : "offers";
  }

  function adjustedMaximumDollars(facets) {
    if (!Number.isFinite(facets.maxAmountCents)) return null;
    const adjustment = facets.maxAmountInclusive ? 0 : 1;
    return Math.max(0, (facets.maxAmountCents - adjustment) / 100);
  }

  function adjustedDeadline(facets) {
    if (!facets.deadlineBefore) return null;
    if (facets.deadlineBeforeInclusive) return facets.deadlineBefore;
    const date = new Date(`${facets.deadlineBefore}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  }

  function discoverSort(sort, domain) {
    if (sort === "most_verified") return domain === "people" ? "reliability" : "strongest-evidence";
    if (sort === "soonest_deadline") return domain === "pools" ? "deadline-risk" : "deadline";
    if (sort === "newest") return domain === "people" ? "recently-verified" : "newest";
    if (sort === "highest_credit") return domain === "people" ? "reliability" : "strongest-evidence";
    if (sort === "lowest_cost") return "lowest-burden";
    return "best-fit";
  }

  function buildDiscoverUrl(interpretation, target) {
    const facets = interpretation.facets || {};
    const domain = inferDiscoverDomain(interpretation, target);
    const params = new URLSearchParams();
    const coFund = isCoFundQuery(interpretation.normalizedQuery);
    params.set("domain", domain);
    params.set("query", interpretation.originalQuery || "");
    params.set("smart", "1");
    if (coFund) params.set("offerKind", "co-fund");

    const broadOpportunitySearch =
      domain === "offers" &&
      !coFund &&
      (!Array.isArray(facets.actionTypes) || facets.actionTypes.length === 0) &&
      /\b(find|search|show|opportunity|opportunities)\b/.test(interpretation.normalizedQuery || "");
    params.set("view", broadOpportunitySearch ? "value" : "list");

    if (Array.isArray(facets.causes) && facets.causes.length) {
      params.set("causeFilter", facets.causes.join(","));
    }
    if (facets.verified === true) params.set("verified", "1");
    if (facets.verified === false) params.set("verified", "0");

    const maximum = adjustedMaximumDollars(facets);
    if (maximum !== null) params.set("max", String(Number(maximum.toFixed(2))));

    const deadline = adjustedDeadline(facets);
    if (deadline) params.set("deadline", deadline);

    const mechanisms = [];
    for (const actionType of facets.actionTypes || []) {
      if (actionType === "pledge" || actionType === "offset") mechanisms.push("trade");
      if (actionType === "payment") mechanisms.push("payment");
    }
    if (mechanisms.length) params.set("mechanisms", [...new Set(mechanisms)].join(","));

    if (Array.isArray(interpretation.residualTerms) && interpretation.residualTerms.length) {
      params.set("terms", interpretation.residualTerms.join(","));
    }
    params.set("sort", discoverSort(facets.sort, domain));
    return `/discover?${params.toString()}`;
  }

  function runNativeSearch(form) {
    bypassNextSubmit = true;
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.submit();
  }

  async function interpret(form, query, clarification) {
    setBusy(form, true);
    clearGenerated();
    try {
      const response = await fetch("/api/query/interpret", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, surface: "discover", clarification }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.interpretation || !payload.target) {
        throw new Error(payload.error || "Query interpretation failed");
      }

      const interpretation = payload.interpretation;
      if (interpretation.needsClarification && interpretation.clarification) {
        const prompt = interpretation.clarification;
        renderClarification(form, prompt, (answer) => {
          interpret(form, query, { field: prompt.field, answer });
        });
        return;
      }

      rememberInterpretation(interpretation);
      const targetUrl = new URL(payload.target, location.origin);
      if (targetUrl.pathname !== "/discover") {
        location.assign(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
        return;
      }
      location.assign(buildDiscoverUrl(interpretation, payload.target));
    } catch {
      runNativeSearch(form);
    } finally {
      setBusy(form, false);
    }
  }

  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.id !== "command-form") return;
      if (bypassNextSubmit) {
        bypassNextSubmit = false;
        return;
      }
      const query = (getQueryInput(form)?.value || "").trim();
      if (!query || busy) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      interpret(form, query);
    },
    true,
  );

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement &&
      (target.name === "q" || target.name === "command" || target.id === "command-input")
    ) {
      clearGenerated();
    }
  });

  applyStoredSummary();
  const observer = new MutationObserver(() => applyStoredSummary());
  const root = document.getElementById("app");
  if (root) observer.observe(root, { childList: true, subtree: true });
})();
