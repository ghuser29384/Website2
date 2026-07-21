/* global MutationObserver, document, localStorage, render, state, toast */

(function enablePlanResources() {
  "use strict";

  const AVAILABLE_BUDGET = 120;
  const STORAGE_KEY = "moraltrade.plan-resources.v1";
  const DEFAULT_PLAN = Object.freeze({
    goal: "factory",
    horizon: "month",
    budget: 80,
    time: "2h",
    verification: "high",
  });

  const GOALS = Object.freeze({
    factory: {
      label: "Reduce factory-farming harm 🎯",
      heading: "Reduce factory-farming harm",
      progress: "Factory farming",
      review: "animal-welfare evidence review",
      compare: "animal-welfare opportunities",
      implementation: "Support cage-free implementation",
      policy: "Support animal-welfare enforcement",
      pool: "Join a cage-free transition pool",
      outcome: "Verified cage-free transition begins",
      redirect: "Redirect a planned donation to animal welfare",
      redirectTarget: "Route it to verified animal-welfare work",
      action: "Commit to a 30-day diet shift",
      track: "Track the change weekly",
      repeat: "Review and extend the change",
      invite: "Invite an animal-welfare counterparty",
    },
    bio: {
      label: "Strengthen biosecurity 🧬",
      heading: "Strengthen biosecurity",
      progress: "Biosecurity",
      review: "biosecurity evidence review",
      compare: "biosecurity opportunities",
      implementation: "Support safety-tool implementation",
      policy: "Fund readiness testing",
      pool: "Join a verified salary-gap pool",
      outcome: "Qualified candidate starts the role",
      redirect: "Redirect a planned donation to biosecurity",
      redirectTarget: "Route it to verified biosecurity work",
      action: "Complete a preparedness action",
      track: "Record lessons and follow-ups",
      repeat: "Repeat the highest-value step",
      invite: "Invite a biosecurity counterparty",
    },
    wild: {
      label: "Reduce wild-animal suffering 🌿",
      heading: "Reduce wild-animal suffering",
      progress: "Wild-animal suffering",
      review: "wild-animal research review",
      compare: "wild-animal-welfare opportunities",
      implementation: "Support field-research implementation",
      policy: "Fund welfare measurement",
      pool: "Join a research threshold pool",
      outcome: "Verified research program begins",
      redirect: "Redirect a planned donation to wild-animal welfare",
      redirectTarget: "Route it to verified welfare research",
      action: "Complete a wildlife-friendly action",
      track: "Record the result weekly",
      repeat: "Extend the most useful action",
      invite: "Invite a wild-animal-welfare counterparty",
    },
    civic: {
      label: "Strengthen civic infrastructure 🏛",
      heading: "Strengthen civic infrastructure",
      progress: "Civic infrastructure",
      review: "civic-infrastructure review",
      compare: "civic-infrastructure opportunities",
      implementation: "Support open-data implementation",
      policy: "Fund public-interest maintenance",
      pool: "Join an open-infrastructure pool",
      outcome: "Verified public tool ships",
      redirect: "Redirect a planned donation to civic infrastructure",
      redirectTarget: "Route it to verified public-interest work",
      action: "Contribute one focused civic task",
      track: "Document the result",
      repeat: "Repeat the highest-value contribution",
      invite: "Invite a civic-infrastructure counterparty",
    },
  });

  const HORIZONS = Object.freeze({
    week: { label: "This week", phrase: "this week" },
    month: { label: "This month", phrase: "this month" },
    next: { label: "Next month", phrase: "next month" },
    quarter: { label: "Next 3 months", phrase: "over the next 3 months" },
  });

  const TIMES = Object.freeze({
    "30m": { label: "~30 minutes", routeTime: "15–20 min" },
    "1h": { label: "~1 hour", routeTime: "20–30 min" },
    "2h": { label: "~2 hours", routeTime: "30–60 min" },
    "4h": { label: "~4 hours", routeTime: "1–2 h" },
    "6h": { label: "6+ hours", routeTime: "2–3 h" },
  });

  const VERIFICATIONS = Object.freeze({
    standard: {
      label: "Standard ◇",
      shortLabel: "Standard",
      article: "a",
      adjective: "screened",
      help: "Balanced evidence checks",
    },
    high: {
      label: "High ◈",
      shortLabel: "High",
      article: "a",
      adjective: "verified",
      help: "Prioritize rigor",
    },
    maximum: {
      label: "Maximum ◆",
      shortLabel: "Maximum",
      article: "an",
      adjective: "independently reviewed",
      help: "Independent review required",
    },
  });

  const MONTH_NAMES = Object.freeze([
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]);

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  function normalizePlan(value) {
    const candidate = value && typeof value === "object" ? value : {};
    const numericBudget = Number(candidate.budget);

    return {
      goal: hasOwn(GOALS, candidate.goal) ? candidate.goal : DEFAULT_PLAN.goal,
      horizon: hasOwn(HORIZONS, candidate.horizon)
        ? candidate.horizon
        : DEFAULT_PLAN.horizon,
      budget: Number.isFinite(numericBudget)
        ? Math.round(clamp(numericBudget, 0, AVAILABLE_BUDGET))
        : DEFAULT_PLAN.budget,
      time: hasOwn(TIMES, candidate.time) ? candidate.time : DEFAULT_PLAN.time,
      verification: hasOwn(VERIFICATIONS, candidate.verification)
        ? candidate.verification
        : DEFAULT_PLAN.verification,
    };
  }

  function horizonEnd(horizon, nowValue) {
    const now = nowValue ? new Date(nowValue) : new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (horizon === "week") end.setDate(end.getDate() + 6);
    if (horizon === "month") end.setMonth(end.getMonth() + 1, 0);
    if (horizon === "next") end.setMonth(end.getMonth() + 2, 0);
    if (horizon === "quarter") end.setMonth(end.getMonth() + 3, 0);

    return end;
  }

  function formatDate(date, includeYear = true) {
    const monthAndDay = `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
    return includeYear ? `${monthAndDay}, ${date.getFullYear()}` : monthAndDay;
  }

  function fallbackRedirectAccounting() {
    return {
      confirmed: false,
      addedMoney: 20,
      moneyLabel: "$20 redirected · $20 counted until baseline confirmed",
      unmatchedLabel: "$20 awaiting baseline confirmation",
    };
  }

  function resolveRedirectAccounting(plan, resourceState) {
    const routeApi = window.__MT_ROUTE_RESOURCES_API__;
    if (!routeApi || !resourceState || !resourceState.periods) {
      return fallbackRedirectAccounting();
    }

    const declarationPeriod = plan.horizon === "week"
      ? "week"
      : plan.horizon === "month"
        ? "month"
        : null;
    if (!declarationPeriod) return fallbackRedirectAccounting();

    return routeApi.buildRedirectAccounting(
      resourceState.periods[declarationPeriod],
      declarationPeriod,
      routeApi.redirectPrincipal,
    );
  }

  function buildRouteModel(value, nowValue, resourceState) {
    const plan = normalizePlan(value);
    const goal = GOALS[plan.goal];
    const horizon = HORIZONS[plan.horizon];
    const time = TIMES[plan.time];
    const verification = VERIFICATIONS[plan.verification];
    const redirect = resolveRedirectAccounting(plan, resourceState);
    const dueDate = horizonEnd(plan.horizon, nowValue);
    const due = formatDate(dueDate);
    const dueShort = formatDate(dueDate, false);
    const directAmount = Math.min(40, plan.budget);
    const poolAmount = Math.min(15, plan.budget);
    const directTitle = directAmount
      ? `Fund ${verification.article} ${verification.adjective} ${goal.review}`
      : `Compare ${goal.compare}`;
    const directMeta = directAmount
      ? `$${directAmount} · ${time.routeTime}`
      : `$0 reserved · ${time.routeTime}`;

    return {
      plan,
      goal,
      title: `${goal.heading} ${horizon.phrase}.`,
      horizonHelp: `by ${due}`,
      budgetHelp: redirect.confirmed
        ? `of $${AVAILABLE_BUDGET} available · confirmed same-period donation principal excluded`
        : `of $${AVAILABLE_BUDGET} available · redirect principal counts until same-period baseline confirmation`,
      timeHelp: horizon.label,
      verificationHelp: verification.help,
      summary: [
        `$${plan.budget} action budget`,
        `${time.label} available`,
        `${verification.shortLabel} verification`,
      ],
      cards: [
        {
          title: `1 · ${goal.redirect}`,
          meta: `${redirect.moneyLabel} · 5 min setup · due ${dueShort}`,
        },
        { title: `2 · ${directTitle}`, meta: directMeta },
        { title: `3 · ${goal.invite}`, meta: `$0 · 5 min` },
      ],
      itinerary: [
        { title: goal.redirect, meta: `${redirect.moneyLabel} · ${dueShort}` },
        {
          title: directTitle,
          meta: `${directAmount ? `$${directAmount}` : "$0 reserved"} · ${dueShort}`,
        },
        { title: goal.invite, meta: `$0 · ${dueShort}` },
      ],
      lanes: [
        [
          [directTitle, directMeta],
          [goal.implementation, "Within your action budget"],
          [goal.policy, `${verification.shortLabel} evidence bar`],
        ],
        [
          [goal.pool, `$${poolAmount} conditional · 2 min`],
          ["Threshold and evidence checks", "Depends"],
          [goal.outcome, "After activation"],
        ],
        [
          [goal.redirect, `${redirect.moneyLabel} · 5 min setup`],
          [goal.redirectTarget, redirect.confirmed ? "Confirmed baseline flow stays separate" : "Confirm the same-period baseline first"],
          ["Publish the recipient record", "Receipt required"],
        ],
        [
          [goal.action, "$0 · 5 min"],
          [goal.track, "$0 · 15 min/wk"],
          [goal.repeat, "Ongoing"],
        ],
        [
          [goal.invite, "$0 · 5 min"],
          ["Agree on a shared action", "15–30 min"],
          ["Coordinate execution", "Ongoing"],
        ],
      ],
    };
  }

  window.__MT_PLAN_RESOURCES_API__ = {
    availableBudget: AVAILABLE_BUDGET,
    buildRouteModel,
    defaultPlan: () => clone(DEFAULT_PLAN),
    normalizePlan,
  };

  if (window.__MT_PLAN_RESOURCES__) return;
  window.__MT_PLAN_RESOURCES__ = true;

  if (typeof state === "undefined" || !state.alloc || typeof render !== "function") return;

  const defaultAllocations = clone(state.alloc);

  function loadPlan() {
    try {
      return normalizePlan(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
    } catch {
      return normalizePlan(DEFAULT_PLAN);
    }
  }

  function savePlan() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.planResources));
    } catch {
      // The controls remain session-functional when storage is unavailable.
    }
  }

  function clearSavedPlan() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Reset still applies to the active session when storage is unavailable.
    }
  }

  state.planResources = loadPlan();

  function normalizeText(element) {
    return String(element?.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function setText(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function setAttribute(element, name, value) {
    if (element && element.getAttribute(name) !== value) element.setAttribute(name, value);
  }

  function findField(panel, label) {
    return Array.from(panel.querySelectorAll(".field")).find(
      (field) => normalizeText(field.querySelector("label")) === label,
    );
  }

  function optionEntries(options) {
    return Object.entries(options).map(([value, details]) => [value, details.label]);
  }

  function installSelect(field, key, options) {
    if (!field) return null;
    let control = field.querySelector(`[data-mt-plan-control="${key}"]`);

    if (!control) {
      const value = field.querySelector(".value");
      if (!value) return null;

      control = document.createElement("select");
      control.className = "value mt-plan-select";
      control.id = `mt-plan-${key}`;
      control.setAttribute("data-mt-plan-control", key);
      control.setAttribute("aria-label", normalizeText(field.querySelector("label")));

      optionEntries(options).forEach(([optionValue, optionLabel]) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionLabel;
        control.append(option);
      });

      value.replaceWith(control);
      const label = field.querySelector("label");
      if (label) label.htmlFor = control.id;
    }

    if (control.getAttribute("data-mt-plan-bound") !== "true") {
      control.addEventListener("change", () => {
        updatePlan(key, control.value, true);
      });
      control.setAttribute("data-mt-plan-bound", "true");
    }

    return control;
  }

  function installBudget(field) {
    if (!field) return null;
    let control = field.querySelector('[data-mt-plan-control="budget"]');

    if (!control) {
      const value = field.querySelector(".value");
      if (!value) return null;

      const editor = document.createElement("div");
      editor.className = "value mt-plan-budget";
      editor.setAttribute("data-mt-plan-editor", "budget");

      const prefix = document.createElement("span");
      prefix.className = "mt-plan-budget-prefix";
      prefix.textContent = "$";

      control = document.createElement("input");
      control.id = "mt-plan-budget";
      control.type = "number";
      control.min = "0";
      control.max = String(AVAILABLE_BUDGET);
      control.step = "5";
      control.inputMode = "decimal";
      control.setAttribute("data-mt-plan-control", "budget");
      control.setAttribute("aria-label", "Monthly action budget in dollars");

      const edit = document.createElement("span");
      edit.className = "mt-plan-budget-edit";
      edit.setAttribute("aria-hidden", "true");
      edit.textContent = "✎";

      editor.append(prefix, control, edit);
      value.replaceWith(editor);
      const label = field.querySelector("label");
      if (label) label.htmlFor = control.id;
    }

    if (control.getAttribute("data-mt-plan-bound") !== "true") {
      control.addEventListener("input", () => {
        if (control.value.trim() === "") return;
        updatePlan("budget", control.value, false);
      });
      control.addEventListener("change", () => {
        updatePlan("budget", control.value, true);
      });
      control.setAttribute("data-mt-plan-bound", "true");
    }

    return control;
  }

  function updatePlan(key, value, announce) {
    state.planResources = normalizePlan({
      ...state.planResources,
      [key]: value,
    });
    savePlan();
    patchPlanResources();

    if (!announce || typeof toast !== "function") return;
    const routeApi = window.__MT_ROUTE_RESOURCES_API__;
    const model = buildRouteModel(
      state.planResources,
      undefined,
      routeApi ? routeApi.getSnapshot() : undefined,
    );
    const messages = {
      goal: `Plan goal changed to ${model.goal.heading}.`,
      horizon: `Plan horizon changed to ${HORIZONS[model.plan.horizon].label}.`,
      budget: `Plan budget updated to $${model.plan.budget}.`,
      time: `Available time updated to ${TIMES[model.plan.time].label}.`,
      verification: `Verification level updated to ${VERIFICATIONS[model.plan.verification].shortLabel}.`,
    };
    toast(messages[key] || "Plan resources updated.");
  }

  function updateHelp(field, text, id) {
    if (!field) return;
    const help = field.querySelector("small.muted");
    if (!help) return;
    help.id = id;
    setText(help, text);
    const control = field.querySelector("[data-mt-plan-control]");
    if (control) setAttribute(control, "aria-describedby", id);
  }

  function syncControlValues(panel, model) {
    const goalField = findField(panel, "change goal");
    const horizonField = findField(panel, "horizon");
    const budgetField = findField(panel, "budget");
    const timeField = findField(panel, "time available");
    const verificationField = findField(panel, "verification level");

    const controls = {
      goal: installSelect(goalField, "goal", GOALS),
      horizon: installSelect(horizonField, "horizon", HORIZONS),
      budget: installBudget(budgetField),
      time: installSelect(timeField, "time", TIMES),
      verification: installSelect(verificationField, "verification", VERIFICATIONS),
    };

    Object.entries(controls).forEach(([key, control]) => {
      if (!control) return;
      const value = String(model.plan[key]);
      if (control.value !== value) control.value = value;
    });

    updateHelp(horizonField, model.horizonHelp, "mt-plan-horizon-help");
    updateHelp(budgetField, model.budgetHelp, "mt-plan-budget-help");
    updateHelp(timeField, model.timeHelp, "mt-plan-time-help");
    updateHelp(
      verificationField,
      model.verificationHelp,
      "mt-plan-verification-help",
    );

    const budgetProgress = budgetField?.querySelector(".progress span");
    if (budgetProgress) {
      const width = `${Math.round((model.plan.budget / AVAILABLE_BUDGET) * 100)}%`;
      if (budgetProgress.style.width !== width) budgetProgress.style.width = width;
    }
  }

  function syncSummary(route, model) {
    const routeHead = route.querySelector(".between");
    if (!routeHead) return;
    let summary = route.querySelector("[data-mt-plan-summary]");

    if (!summary) {
      summary = document.createElement("div");
      summary.className = "mt-plan-summary";
      summary.setAttribute("data-mt-plan-summary", "true");
      summary.setAttribute("aria-live", "polite");
      model.summary.forEach((_, index) => {
        const item = document.createElement("span");
        item.setAttribute("data-mt-plan-summary-item", String(index));
        summary.append(item);
      });
      routeHead.insertAdjacentElement("afterend", summary);
    }

    model.summary.forEach((text, index) => {
      setText(summary.querySelector(`[data-mt-plan-summary-item="${index}"]`), text);
    });
  }

  function syncLane(lane, steps) {
    if (!lane) return;
    const renderedSteps = Array.from(lane.querySelectorAll(".step"));
    steps.forEach(([label, meta], index) => {
      const step = renderedSteps[index];
      if (!step) return;
      let labelNode = step.querySelector(".mt-plan-step-label");
      let metaNode = step.querySelector("em");

      if (!labelNode) {
        step.textContent = "";
        labelNode = document.createElement("span");
        labelNode.className = "mt-plan-step-label";
        metaNode = document.createElement("em");
        step.append(labelNode, metaNode);
      }

      setText(labelNode, label);
      setText(metaNode, meta);
    });
  }

  function syncRecommendations(route, model) {
    const recommendationLabel = Array.from(route.querySelectorAll(".eyebrow")).find(
      (element) => normalizeText(element) === "recommended mixed route",
    );
    const recommendationGrid = recommendationLabel?.nextElementSibling;
    const cards = recommendationGrid ? Array.from(recommendationGrid.children) : [];

    model.cards.forEach((card, index) => {
      const element = cards[index];
      if (!element) return;
      element.setAttribute("data-mt-route-step", String(index + 1));
      setText(element.querySelector("b"), card.title);
      setText(element.querySelector("small"), card.meta);
    });

    const laneSelectors = [".blue-l", ".green-l", ".orange-l", ".purple-l", ".gray-l"];
    laneSelectors.forEach((selector, index) => {
      syncLane(route.querySelector(`.lane${selector}`), model.lanes[index]);
    });

    const customRouteButton = Array.from(route.querySelectorAll("button")).find(
      (button) => normalizeText(button) === "custom route",
    );
    if (customRouteButton) {
      customRouteButton.type = "button";
      setAttribute(customRouteButton, "data-mt-cr-action", "open");
    }
  }

  function syncItinerary(model) {
    const items = Array.from(document.querySelectorAll(".itinerary .it-item"));
    model.itinerary.forEach((item, index) => {
      const element = items[index];
      if (!element) return;
      element.setAttribute("data-mt-itinerary-step", String(index + 1));
      setText(element.querySelector("b"), item.title);
      setText(element.querySelector("small"), item.meta);
    });
  }

  function syncProgress(model) {
    const progressPanel = Array.from(
      document.querySelectorAll(".plan-grid > aside.stack .panel"),
    ).find((panel) =>
      Array.from(panel.querySelectorAll(".eyebrow")).some(
        (element) => normalizeText(element) === "current progress",
      ),
    );
    if (!progressPanel) return;

    const lines = Array.from(progressPanel.querySelectorAll(".side-row > div"));
    const goalLine = lines.find((line) => normalizeText(line).startsWith("goal "));
    const budgetLine = lines.find((line) => normalizeText(line).startsWith("budget set"));
    setText(goalLine, `Goal set · ${model.goal.progress}`);
    setText(budgetLine, `Budget set · $${model.plan.budget} / $${AVAILABLE_BUDGET}`);
  }

  function syncPlanSurface(model) {
    const route = document.querySelector(".route");
    if (!route) return;

    setText(route.querySelector("h2"), model.title);
    setText(route.querySelector(".between .tag"), "Goal active");
    syncSummary(route, model);
    syncRecommendations(route, model);
    syncItinerary(model);
    syncProgress(model);
  }

  function resetPlanResources(event) {
    event.preventDefault();
    state.planResources = clone(DEFAULT_PLAN);
    state.alloc = clone(defaultAllocations);
    clearSavedPlan();
    render();
    patchPlanResources();

    if (typeof toast === "function") {
      toast("Plan resources reset to defaults.");
    }
  }

  function installReset(panel) {
    const resetButton = Array.from(panel.querySelectorAll("button")).find(
      (button) => normalizeText(button).replace(/^↻\s*/, "") === "reset",
    );
    if (!resetButton) return;

    resetButton.type = "button";
    setAttribute(resetButton, "data-mt-plan-reset", "true");
    setAttribute(resetButton, "aria-label", "Reset all plan resources to defaults");

    if (resetButton.getAttribute("data-mt-plan-bound") !== "true") {
      resetButton.addEventListener("click", resetPlanResources);
      resetButton.setAttribute("data-mt-plan-bound", "true");
    }
  }

  function patchPlanResources() {
    const panel = document.querySelector(".plan-control");
    if (!panel) return false;

    const routeApi = window.__MT_ROUTE_RESOURCES_API__;
    const model = buildRouteModel(
      state.planResources,
      undefined,
      routeApi ? routeApi.getSnapshot() : undefined,
    );
    syncControlValues(panel, model);
    syncPlanSurface(model);
    installReset(panel);
    return true;
  }

  patchPlanResources();

  const observer = new MutationObserver(patchPlanResources);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  const routeApi = window.__MT_ROUTE_RESOURCES_API__;
  if (routeApi && typeof routeApi.subscribe === "function") {
    routeApi.subscribe(() => patchPlanResources());
  }
})();
