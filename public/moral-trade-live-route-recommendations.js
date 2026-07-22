(function installLiveRouteRecommendations() {
  "use strict";

  if (window.__MT_LIVE_ROUTE_RECOMMENDATIONS_ACTIVE__) return;
  window.__MT_LIVE_ROUTE_RECOMMENDATIONS_ACTIVE__ = true;

  const PROFILE_ENDPOINT = "/api/live-now/route-profile";
  const LIVE_NOW_ENDPOINT = "/api/live-now";
  const STYLE_ID = "mt-live-route-recommendations-styles";
  const ALLOWED_STATUSES = new Set([
    "incomplete",
    "loading",
    "no_live",
    "no_matches",
    "profile_incomplete",
    "ready",
    "signed_out",
    "unavailable",
  ]);
  const FORMAT_OPTIONS = Object.freeze([
    { value: "direct", label: "Trade" },
    { value: "threshold", label: "Pool" },
    { value: "redirect", label: "Redirect" },
    { value: "personal", label: "Personal action" },
    { value: "coalition", label: "Coalition" },
  ]);
  const FORMAT_VALUES = new Set(FORMAT_OPTIONS.map((option) => option.value));
  const DEFAULT_LABELS = Object.freeze(["Best fit", "Lowest friction", "Live coordination"]);
  const METRIC_LABELS = Object.freeze([
    ["fit", "Fit"],
    ["friction", "Friction"],
    ["evidence", "Evidence"],
    ["coordination", "Coordination"],
  ]);

  const initialBootstrap = readBootstrap();
  if (!Object.prototype.hasOwnProperty.call(initialBootstrap, "routePlanner")) return;
  let planner = normalizePlanner(initialBootstrap.routePlanner);
  let busy = false;
  let requestError = "";
  let requestMessage = "";
  let renderRevision = 1;
  let observerQueued = false;

  function readBootstrap() {
    return window.__MT_LIVE_NOW_BOOTSTRAP__ &&
      typeof window.__MT_LIVE_NOW_BOOTSTRAP__ === "object"
      ? window.__MT_LIVE_NOW_BOOTSTRAP__
      : {};
  }

  function string(value, maximum = 240) {
    return typeof value === "string" ? value.trim().slice(0, maximum) : "";
  }

  function integer(value, fallback, minimum, maximum) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safePath(value) {
    const path = string(value, 500);
    if (!path.startsWith("/") || path.startsWith("//")) return "";
    try {
      const parsed = new URL(path, window.location.origin);
      return parsed.origin === window.location.origin
        ? `${parsed.pathname}${parsed.search}${parsed.hash}`
        : "";
    } catch {
      return "";
    }
  }

  function uniqueStrings(value, maximumItems, maximumLength = 160) {
    const result = [];
    const seen = new Set();
    for (const entry of Array.isArray(value) ? value : []) {
      const cleaned = string(
        typeof entry === "string" ? entry : entry?.label ?? entry?.cause,
        maximumLength,
      );
      const key = cleaned.toLowerCase();
      if (!cleaned || seen.has(key)) continue;
      seen.add(key);
      result.push(cleaned);
      if (result.length >= maximumItems) break;
    }
    return result;
  }

  function enumValue(value, allowed, fallback) {
    const candidate = string(value, 40);
    return allowed.has(candidate) ? candidate : fallback;
  }

  function normalizeFormats(value) {
    const aliases = {
      direct_trade: "direct",
      donation_pool: "threshold",
      donation_redirect: "redirect",
      invite: "coalition",
      offer: "direct",
      personal_action: "personal",
      pool: "threshold",
    };
    const result = [];
    for (const entry of Array.isArray(value) ? value : []) {
      const raw = string(entry, 40);
      const normalized = aliases[raw] || raw;
      if (!FORMAT_VALUES.has(normalized) || result.includes(normalized)) continue;
      result.push(normalized);
    }
    return result.length ? result : ["direct"];
  }

  function normalizeProfile(value) {
    const input = value && typeof value === "object" ? value : {};
    return {
      goal: string(input.goal, 180),
      causePriorities: uniqueStrings(input.causePriorities, 16, 120),
      moneyBudgetCents: integer(input.moneyBudgetCents, 0, 0, 100_000_000),
      timeBudgetMinutes: integer(input.timeBudgetMinutes, 0, 0, 100_000),
      actionBudgetCount:
        input.actionBudgetCount === null || input.actionBudgetCount === undefined
          ? null
          : integer(input.actionBudgetCount, 0, 0, 1_000),
      horizon: enumValue(
        input.horizon,
        new Set(["day", "week", "month", "quarter", "year"]),
        "month",
      ),
      routeFormats: normalizeFormats(input.routeFormats),
      evidencePreference: enumValue(
        input.evidencePreference,
        new Set(["standard", "high", "connected"]),
        "high",
      ),
      uncertaintyPreference: enumValue(
        input.uncertaintyPreference,
        new Set(["conservative", "balanced", "exploratory"]),
        "balanced",
      ),
      interactionPreference: enumValue(
        input.interactionPreference,
        new Set(["solo", "open", "invite"]),
        "open",
      ),
      privacyPreference: enumValue(
        input.privacyPreference,
        new Set(["private", "public-safe", "public"]),
        "private",
      ),
      plannedDonationBaseline:
        input.plannedDonationBaseline === true
          ? true
          : input.plannedDonationBaseline === false
            ? false
            : null,
      plannedDonationCents: integer(input.plannedDonationCents, 0, 0, 100_000_000),
      otherwiseBaseline: string(input.otherwiseBaseline, 700),
      calibrationCount: integer(input.calibrationCount, 0, 0, 1_000),
      interviewCompleted: input.interviewCompleted === true,
    };
  }

  function normalizeStep(value) {
    if (!value || typeof value !== "object") return null;
    const sourceId = string(value.sourceId, 160);
    const title = string(value.title, 220);
    const href = safePath(value.href);
    if (!sourceId || !title || value.live !== true || !href) return null;
    return {
      sourceId,
      sourceType: string(value.sourceType, 60) || "opportunity",
      title,
      detail: string(value.detail, 500),
      href,
      costCents: integer(value.costCents, 0, 0, 100_000_000),
      timeMinutes: integer(value.timeMinutes, 0, 0, 100_000),
      evidenceLabel: string(value.evidenceLabel, 120),
      live: true,
      why: string(value.why, 320),
    };
  }

  function normalizeRoute(value, index) {
    if (!value || typeof value !== "object") return null;
    const id = string(value.id, 160);
    const steps = (Array.isArray(value.steps) ? value.steps : [])
      .map(normalizeStep)
      .filter(Boolean)
      .slice(0, 6);
    if (!id || !steps.length) return null;
    const metrics = value.metrics && typeof value.metrics === "object" ? value.metrics : {};
    const normalizeMetric = (metric) => {
      const input = metric && typeof metric === "object" ? metric : {};
      return {
        value: integer(input.value ?? metric, 0, 0, 100),
        label: string(input.label, 100),
        basis: string(input.basis, 420),
      };
    };
    return {
      id,
      label: string(value.label, 80) || DEFAULT_LABELS[index] || "Route",
      summary: string(value.summary, 420),
      metrics: {
        fit: normalizeMetric(metrics.fit),
        friction: normalizeMetric(metrics.friction),
        evidence: normalizeMetric(metrics.evidence),
        coordination: normalizeMetric(metrics.coordination),
      },
      steps,
      uncertainties: uniqueStrings(value.uncertainties, 6, 260),
    };
  }

  function normalizeComparisonOption(value) {
    if (!value || typeof value !== "object") return null;
    const title = string(value.title, 180);
    const format = string(value.format, 24);
    if (!title || !FORMAT_VALUES.has(format)) return null;
    return { title, format, detail: string(value.detail, 360) };
  }

  function normalizeComparison(value) {
    if (!value || typeof value !== "object") return null;
    const key = string(value.key, 120);
    const left = normalizeComparisonOption(value.left);
    const right = normalizeComparisonOption(value.right);
    if (!key || !left || !right || left.format === right.format) return null;
    return {
      key,
      left,
      right,
      answeredCount: integer(value.answeredCount, 0, 0, 1_000),
      targetCount: integer(value.targetCount, 5, 1, 1_000),
      hypothetical: value.hypothetical === true,
    };
  }

  function normalizePlanner(value) {
    const input = value && typeof value === "object" ? value : {};
    const rawStatus = string(input.status, 40);
    return {
      status: ALLOWED_STATUSES.has(rawStatus) ? rawStatus : "unavailable",
      checkedAt: string(input.checkedAt, 40),
      profile: normalizeProfile(input.profile),
      needsMoreInput: uniqueStrings(input.needsMoreInput, 12, 80),
      routes: (Array.isArray(input.routes) ? input.routes : [])
        .map(normalizeRoute)
        .filter(Boolean)
        .slice(0, 3),
      comparison: normalizeComparison(input.comparison),
      candidateCount: integer(input.candidateCount, 0, 0, 1_000_000),
    };
  }

  function statusKind(value) {
    if (value === "profile_incomplete" || value === "incomplete") return "incomplete";
    if (value === "no_matches" || value === "no_live") return "no_live";
    return value;
  }

  function needs(...keys) {
    const values = planner.needsMoreInput.map((value) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, ""),
    );
    return keys.some((key) => {
      const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      return values.some((value) => value === normalized || value.includes(normalized));
    });
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = "/moral-trade-live-route-recommendations.css";
    document.head.append(link);
  }

  function formatMoney(cents) {
    const dollars = Math.max(0, cents) / 100;
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
    }).format(dollars);
  }

  function formatCheckedAt(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Not checked yet";
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  function formatSourceType(value) {
    const labels = {
      donation_pool: "Pool",
      donation_redirect: "Redirect",
      live_match: "Live match",
      offer: "Offer",
      personal_action: "Personal action",
    };
    return labels[value] || value.replace(/[_-]+/g, " ");
  }

  function renderFormatChecks(selectedFormats) {
    return FORMAT_OPTIONS.map(
      (option) => `<label class="mt-lrp-format">
        <input type="checkbox" name="routeFormat" value="${option.value}" ${selectedFormats.includes(option.value) ? "checked" : ""}>
        <span>${option.label}</span>
      </label>`,
    ).join("");
  }

  function renderComposer() {
    const profile = planner.profile;
    const currentStatus = statusKind(planner.status);
    if (currentStatus === "signed_out") {
      return `<aside class="panel mt-lrp-composer" data-mt-live-route-composer>
        <div class="eyebrow blue">YOUR ROUTE</div>
        <h2>Make it yours.</h2>
        <p>Sign in to save private limits and baselines.</p>
        <a class="btn primary" href="/login?returnTo=%2Fmoral-trade-live.html%23now">Sign in →</a>
      </aside>`;
    }

    const donationNeedsAnswer = needs("plannedDonationBaseline", "plannedDonation");
    const donationSelection = profile.plannedDonationBaseline === true
      ? "yes"
      : profile.plannedDonationBaseline === false
        ? "no"
        : "";
    const showOtherwise = true;
    const showDonation =
      profile.routeFormats.includes("redirect") ||
      profile.plannedDonationBaseline ||
      donationNeedsAnswer;
    const disableSave = busy || currentStatus === "unavailable";

    return `<aside class="panel mt-lrp-composer" data-mt-live-route-composer>
      <header>
        <div class="eyebrow blue">YOUR ROUTE</div>
        <h2>Set the limits.</h2>
        <p>We ask only what can change the result.</p>
      </header>
      <form data-mt-lrp-profile-form novalidate>
        <label class="mt-lrp-field" for="mt-lrp-goal">
          <span>Goal</span>
          <input id="mt-lrp-goal" name="goal" maxlength="180" required value="${escapeHtml(profile.goal)}" placeholder="What should change?">
        </label>
        <label class="mt-lrp-field" for="mt-lrp-cause">
          <span>Cause area used for matching</span>
          <input id="mt-lrp-cause" name="causePriority" maxlength="120" required value="${escapeHtml(profile.causePriorities[0] || "")}" placeholder="For example: Farmed-animal welfare">
          <small>This is matched to cause labels on live listings; it stays separate from your goal statement.</small>
        </label>
        <div class="mt-lrp-pair">
          <label class="mt-lrp-field" for="mt-lrp-money">
            <span>Money</span>
            <span class="mt-lrp-number"><i aria-hidden="true">$</i><input id="mt-lrp-money" name="moneyBudget" type="number" min="0" max="1000000" step="1" inputmode="decimal" required value="${escapeHtml(profile.moneyBudgetCents / 100)}"></span>
          </label>
          <label class="mt-lrp-field" for="mt-lrp-time">
            <span>Minutes</span>
            <input id="mt-lrp-time" name="timeBudgetMinutes" type="number" min="0" max="100000" step="5" inputmode="numeric" required value="${escapeHtml(profile.timeBudgetMinutes)}">
          </label>
          <label class="mt-lrp-field" for="mt-lrp-actions">
            <span>Actions</span>
            <input id="mt-lrp-actions" name="actionBudgetCount" type="number" min="0" max="1000" step="1" inputmode="numeric" required value="${escapeHtml(profile.actionBudgetCount === null ? 3 : profile.actionBudgetCount)}">
          </label>
        </div>
        <label class="mt-lrp-field" for="mt-lrp-horizon">
          <span>Time horizon</span>
          <select id="mt-lrp-horizon" name="horizon">
            ${selectOptions([["day", "Today"], ["week", "This week"], ["month", "This month"], ["quarter", "This quarter"], ["year", "This year"]], profile.horizon)}
          </select>
        </label>
        <fieldset class="mt-lrp-formats">
          <legend>Ways I can help</legend>
          <div>${renderFormatChecks(profile.routeFormats)}</div>
        </fieldset>
        <div class="mt-lrp-conditional" data-mt-lrp-baseline-fields ${showOtherwise ? "" : "hidden"}>
          <label class="mt-lrp-field" for="mt-lrp-otherwise">
            <span>Without a trade, I would…</span>
            <textarea id="mt-lrp-otherwise" name="otherwiseBaseline" maxlength="700" rows="3" required placeholder="Describe the no-trade baseline">${escapeHtml(profile.otherwiseBaseline)}</textarea>
          </label>
        </div>
        <div class="mt-lrp-conditional" data-mt-lrp-donation-fields data-force-visible="${donationNeedsAnswer}" ${showDonation ? "" : "hidden"}>
          <label class="mt-lrp-field" for="mt-lrp-donation-baseline">
            <span>Was a donation already planned?</span>
            <select id="mt-lrp-donation-baseline" name="plannedDonationBaseline">
              <option value="" ${donationSelection === "" ? "selected" : ""}>Not answered</option>
              <option value="yes" ${donationSelection === "yes" ? "selected" : ""}>Yes</option>
              <option value="no" ${donationSelection === "no" ? "selected" : ""}>No</option>
            </select>
          </label>
          <label class="mt-lrp-field" for="mt-lrp-donation-amount" data-mt-lrp-donation-amount ${profile.plannedDonationBaseline ? "" : "hidden"}>
            <span>Planned amount</span>
            <span class="mt-lrp-number"><i aria-hidden="true">$</i><input id="mt-lrp-donation-amount" name="plannedDonation" type="number" min="0" max="1000000" step="1" inputmode="decimal" value="${escapeHtml(profile.plannedDonationCents / 100)}"></span>
          </label>
          <small>Redirects appear only when this baseline is real.</small>
        </div>
        <p class="mt-lrp-form-error" data-mt-lrp-form-error role="alert"></p>
        <button class="btn primary mt-lrp-save" type="submit" ${disableSave ? "disabled" : ""}>${busy ? "Updating…" : "Update routes"}</button>
      </form>
    </aside>`;
  }

  function renderMetric(key, label, metric) {
    const value = metric.value;
    return `<div class="mt-lrp-metric mt-lrp-metric--${key}">
      <span>${label}</span>
      <strong>${value}</strong>
      <i aria-hidden="true"><b style="width:${value}%"></b></i>
    </div>`;
  }

  function renderMetricNotes(metrics) {
    return `<details class="mt-lrp-metric-notes">
      <summary>How these measures were calculated</summary>
      <dl>${METRIC_LABELS.map(([key, label]) => {
        const metric = metrics[key];
        return `<div><dt>${escapeHtml(label)} · ${escapeHtml(metric.label || "Measured")}</dt><dd>${escapeHtml(metric.basis || "No calculation basis was supplied.")}</dd></div>`;
      }).join("")}</dl>
    </details>`;
  }

  function renderStep(step, index) {
    const meta = [];
    if (step.costCents > 0) meta.push(formatMoney(step.costCents));
    if (step.timeMinutes > 0) meta.push(`${step.timeMinutes} min`);
    if (step.evidenceLabel) meta.push(step.evidenceLabel);
    const sourceLink = step.live && step.href
      ? `<a class="mt-lrp-source-link" href="${escapeHtml(step.href)}">Open source →</a>`
      : "";
    return `<li class="mt-lrp-step" data-source-id="${escapeHtml(step.sourceId)}" data-source-live="${step.live}">
      <div class="mt-lrp-step-index" aria-hidden="true">${index + 1}</div>
      <div class="mt-lrp-step-copy">
        <div class="mt-lrp-step-top">
          <span class="mt-lrp-live ${step.live ? "is-live" : "is-planned"}">${step.live ? "Live" : "Plan"}</span>
          <span>${escapeHtml(formatSourceType(step.sourceType))}</span>
        </div>
        <h4>${escapeHtml(step.title)}</h4>
        ${step.detail ? `<p>${escapeHtml(step.detail)}</p>` : ""}
        ${meta.length ? `<p class="mt-lrp-step-meta">${meta.map(escapeHtml).join(" · ")}</p>` : ""}
        ${step.why ? `<p class="mt-lrp-why"><b>Why</b> ${escapeHtml(step.why)}</p>` : ""}
        ${sourceLink}
      </div>
    </li>`;
  }

  function renderRouteCard(route, index) {
    const hasLiveSource = route.steps.some((step) => step.live && step.href);
    const requestedLabel = route.label || DEFAULT_LABELS[index] || "Route";
    const label = requestedLabel.toLowerCase().includes("live") && !hasLiveSource
      ? "Coordination option"
      : requestedLabel;
    return `<article class="mt-lrp-route-card mt-lrp-route-card--${index + 1}" data-mt-live-route-card="${escapeHtml(route.id)}" aria-labelledby="mt-lrp-route-${index}">
      <header class="mt-lrp-route-head">
        <div>
          <span class="mt-lrp-route-label">${escapeHtml(label)}</span>
          <h3 id="mt-lrp-route-${index}">${escapeHtml(route.summary || route.steps[0].title)}</h3>
        </div>
        <span class="mt-lrp-route-number" aria-hidden="true">0${index + 1}</span>
      </header>
      <div class="mt-lrp-metrics" aria-label="Route measures">
        ${METRIC_LABELS.map(([key, metricLabel]) => renderMetric(key, metricLabel, route.metrics[key])).join("")}
      </div>
      ${renderMetricNotes(route.metrics)}
      <ol class="mt-lrp-steps">${route.steps.map(renderStep).join("")}</ol>
      ${route.uncertainties.length ? `<details class="mt-lrp-uncertainty"><summary>What is uncertain</summary><ul>${route.uncertainties.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></details>` : ""}
    </article>`;
  }

  function humanNeed(value) {
    const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalized.includes("goal")) return "Goal";
    if (normalized.includes("money")) return "Money limit";
    if (normalized.includes("time")) return "Time limit";
    if (normalized.includes("horizon")) return "Time horizon";
    if (normalized.includes("format")) return "Ways you can help";
    if (normalized.includes("planned") || normalized.includes("donation")) return "Planned-donation baseline";
    if (normalized.includes("baseline")) return "What happens without a trade";
    return value.replace(/[_-]+/g, " ");
  }

  function renderState(title, copy, options = {}) {
    const needsList = options.needs?.length
      ? `<ul class="mt-lrp-needs">${options.needs.map((item) => `<li>${escapeHtml(humanNeed(item))}</li>`).join("")}</ul>`
      : "";
    const actions = options.actions || "";
    return `<div class="mt-lrp-state" data-mt-live-route-state="${escapeHtml(options.state || "")}">
      <span class="mt-lrp-state-mark" aria-hidden="true">${escapeHtml(options.mark || "→")}</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(copy)}</p>
      ${needsList}${actions}
    </div>`;
  }

  function renderResults() {
    const currentStatus = statusKind(planner.status);
    let body = "";
    if (currentStatus === "signed_out") {
      body = renderState(
        "Sign in to see your routes.",
        "No personalized or demo route is shown while signed out.",
        {
          state: "signed_out",
          actions: '<a class="btn primary" href="/login?returnTo=%2Fmoral-trade-live.html%23now">Sign in →</a>',
        },
      );
    } else if (currentStatus === "incomplete") {
      body = renderState(
        "Finish the few details that change the result.",
        "Routes stay hidden until the required limits and baseline are known.",
        { state: "incomplete", needs: planner.needsMoreInput, mark: "…" },
      );
    } else if (currentStatus === "unavailable") {
      body = renderState(
        "Routes are temporarily unavailable.",
        "Your profile remains private. Refresh or try again shortly.",
        { state: "unavailable", mark: "!" },
      );
    } else if (currentStatus === "loading") {
      body = renderState("Checking live sources…", "No fallback route is substituted.", {
        state: "loading",
        mark: "…",
      });
    } else if (currentStatus === "no_live" || !planner.routes.length) {
      body = renderState(
        "No live route right now.",
        "Nothing open currently fits these limits.",
        {
          state: "no_live",
          mark: "○",
          actions: `<div class="mt-lrp-state-actions"><a class="btn" href="/offers">Browse live offers</a><a class="btn" href="/offers/new">Create an offer</a></div><small>These are next actions, not recommendations.</small>`,
        },
      );
    } else {
      body = `<div class="mt-lrp-route-list">${planner.routes.slice(0, 3).map(renderRouteCard).join("")}</div>`;
    }

    return `<section class="mt-lrp-results-inner" data-mt-live-route-results data-state="${escapeHtml(currentStatus)}">
      <header class="mt-lrp-results-head">
        <div>
          <div class="eyebrow blue">LIVE ROUTES</div>
          <h2>${planner.profile.goal ? `Routes for ${escapeHtml(planner.profile.goal)}` : "Your best available routes"}</h2>
          <p>Screened for clear overlap with what you said you would otherwise do.</p>
        </div>
        <div class="mt-lrp-checked">
          <span>${planner.candidateCount} candidate${planner.candidateCount === 1 ? "" : "s"}</span>
          <time datetime="${escapeHtml(planner.checkedAt)}">Checked ${escapeHtml(formatCheckedAt(planner.checkedAt))}</time>
        </div>
      </header>
      ${requestError ? `<p class="mt-lrp-request-error" role="alert">${escapeHtml(requestError)}</p>` : ""}
      ${body}
    </section>`;
  }

  function renderComparisonDialog() {
    const comparison = planner.comparison;
    if (!comparison) return "";
    const progress = `${Math.min(comparison.answeredCount, comparison.targetCount)} of ${comparison.targetCount}`;
    return `<dialog class="mt-lrp-dialog mt-lrp-comparison-dialog" id="mt-lrp-comparison-dialog" aria-labelledby="mt-lrp-comparison-title">
      <form method="dialog" class="mt-lrp-dialog-shell">
        <header class="mt-lrp-dialog-head">
          <div><div class="eyebrow blue">PREFERENCE CHECK · ${progress}</div><h2 id="mt-lrp-comparison-title">Which works better for you?</h2></div>
          <button class="mt-lrp-close" value="cancel" aria-label="Close comparison">×</button>
        </header>
        ${comparison.hypothetical ? '<p class="mt-lrp-hypothetical"><b>Preference example.</b> Hypothetical — not a live offer.</p>' : ""}
        <div class="mt-lrp-comparison-options">
          <button type="button" class="mt-lrp-comparison-option" data-mt-lrp-comparison-choice="left" aria-label="Choose A: ${escapeHtml(comparison.left.title)}">
            <span>A · ${escapeHtml(formatSourceType(comparison.left.format))}</span>
            <strong>${escapeHtml(comparison.left.title)}</strong>
            <small>${escapeHtml(comparison.left.detail)}</small>
          </button>
          <button type="button" class="mt-lrp-comparison-option" data-mt-lrp-comparison-choice="right" aria-label="Choose B: ${escapeHtml(comparison.right.title)}">
            <span>B · ${escapeHtml(formatSourceType(comparison.right.format))}</span>
            <strong>${escapeHtml(comparison.right.title)}</strong>
            <small>${escapeHtml(comparison.right.detail)}</small>
          </button>
        </div>
        <div class="mt-lrp-comparison-neutral" aria-label="Other comparison answers">
          <button type="button" class="btn" data-mt-lrp-comparison-choice="equal">About equal</button>
          <button type="button" class="btn" data-mt-lrp-comparison-choice="neither">Neither</button>
          <button type="button" class="btn ghost" data-mt-lrp-comparison-choice="unsure">Unsure</button>
        </div>
        <p class="mt-lrp-dialog-note">This adjusts preferences only. It never accepts or starts an offer.</p>
      </form>
    </dialog>`;
  }

  function selectOptions(options, selected) {
    return options
      .map(([value, label, unavailable = false]) => `<option value="${value}" ${value === selected ? "selected" : ""} ${unavailable && value !== selected ? "disabled" : ""}>${label}</option>`)
      .join("");
  }

  function renderInterviewDialog() {
    const profile = planner.profile;
    return `<dialog class="mt-lrp-dialog mt-lrp-interview-dialog" id="mt-lrp-interview-dialog" aria-labelledby="mt-lrp-interview-title">
      <div class="mt-lrp-dialog-shell">
        <header class="mt-lrp-dialog-head">
          <div><div class="eyebrow blue">GUIDED GOAL INTERVIEW</div><h2 id="mt-lrp-interview-title">Tell us what should change.</h2></div>
          <button class="mt-lrp-close" type="button" data-mt-lrp-action="close-dialog" aria-label="Close goal interview">×</button>
        </header>
        <form data-mt-lrp-interview-form>
          <div data-mt-lrp-interview-edit>
            <label class="mt-lrp-field" for="mt-lrp-interview-goal"><span>Desired change</span><textarea id="mt-lrp-interview-goal" name="goal" maxlength="180" rows="2" required>${escapeHtml(profile.goal)}</textarea></label>
            <label class="mt-lrp-field" for="mt-lrp-interview-cause"><span>Cause area used for matching</span><input id="mt-lrp-interview-cause" name="causePriority" maxlength="120" required value="${escapeHtml(profile.causePriorities[0] || "")}" placeholder="For example: Global health"></label>
            <label class="mt-lrp-field" for="mt-lrp-interview-baseline"><span>Without a trade, what happens?</span><textarea id="mt-lrp-interview-baseline" name="otherwiseBaseline" maxlength="700" rows="3" required>${escapeHtml(profile.otherwiseBaseline)}</textarea></label>
            <div class="mt-lrp-interview-grid">
              <label class="mt-lrp-field" for="mt-lrp-interview-evidence"><span>Evidence</span><select id="mt-lrp-interview-evidence" name="evidencePreference">${selectOptions([["standard", "Standard"], ["high", "High"], ["connected", "Connected proof — no eligible inventory yet", true]], profile.evidencePreference)}</select></label>
              <label class="mt-lrp-field" for="mt-lrp-interview-uncertainty"><span>Uncertainty</span><select id="mt-lrp-interview-uncertainty" name="uncertaintyPreference">${selectOptions([["conservative", "Conservative — no bounded inventory yet", true], ["balanced", "Balanced"], ["exploratory", "Exploratory"]], profile.uncertaintyPreference)}</select></label>
              <label class="mt-lrp-field" for="mt-lrp-interview-interaction"><span>People</span><select id="mt-lrp-interview-interaction" name="interactionPreference">${selectOptions([["solo", "Solo only"], ["open", "Open to people"], ["invite", "Invite only — no invitation-backed inventory yet", true]], profile.interactionPreference)}</select></label>
              <label class="mt-lrp-field" for="mt-lrp-interview-privacy"><span>Privacy</span><select id="mt-lrp-interview-privacy" name="privacyPreference">${selectOptions([["private", "Private"], ["public-safe", "Match-safe"], ["public", "Public"]], profile.privacyPreference)}</select></label>
            </div>
            <p class="mt-lrp-inventory-note">Unavailable modes stay fail-closed until a verified source supplies the required metadata.</p>
            <footer class="mt-lrp-dialog-actions"><button class="btn" type="button" data-mt-lrp-action="close-dialog">Cancel</button><button class="btn primary" type="submit">Review answers</button></footer>
          </div>
          <div data-mt-lrp-interview-review hidden>
            <p class="mt-lrp-review-intro">Check the structured profile before it changes your routes.</p>
            <dl class="mt-lrp-review-list">
              <div><dt>Desired change</dt><dd data-mt-lrp-review="goal"></dd></div>
              <div><dt>Matching cause</dt><dd data-mt-lrp-review="causePriorities"></dd></div>
              <div><dt>Without a trade</dt><dd data-mt-lrp-review="otherwiseBaseline"></dd></div>
              <div><dt>Evidence</dt><dd data-mt-lrp-review="evidencePreference"></dd></div>
              <div><dt>Uncertainty</dt><dd data-mt-lrp-review="uncertaintyPreference"></dd></div>
              <div><dt>Interaction</dt><dd data-mt-lrp-review="interactionPreference"></dd></div>
              <div><dt>Privacy</dt><dd data-mt-lrp-review="privacyPreference"></dd></div>
            </dl>
            <footer class="mt-lrp-dialog-actions"><button class="btn" type="button" data-mt-lrp-action="edit-interview">Edit</button><button class="btn primary" type="button" data-mt-lrp-action="confirm-interview">Confirm profile</button></footer>
          </div>
        </form>
      </div>
    </dialog>`;
  }

  function renderTools() {
    const profile = planner.profile;
    const compareButton = planner.comparison
      ? '<button class="btn mt-lrp-tool-button" type="button" data-mt-lrp-action="open-comparison">Compare two options</button>'
      : '<p class="mt-lrp-tool-done">No comparison needed now.</p>';
    const resetButton = profile.calibrationCount > 0
      ? '<button class="mt-lrp-text-button" type="button" data-mt-lrp-action="reset-calibration">Reset comparisons</button>'
      : "";
    return `<aside class="mt-lrp-tools" data-mt-live-route-tools>
      <section class="panel mt-lrp-tool-card">
        <div class="eyebrow">TUNE THE ROUTE</div>
        <h3>Only when useful.</h3>
        ${compareButton}
        <button class="btn mt-lrp-tool-button" type="button" data-mt-lrp-action="open-interview">Guided goal interview</button>
        ${resetButton}
        <small>${profile.calibrationCount} comparison${profile.calibrationCount === 1 ? "" : "s"} saved${profile.interviewCompleted ? " · interview confirmed" : ""}</small>
      </section>
      <section class="panel mt-lrp-tool-card mt-lrp-truth-card">
        <div class="eyebrow">WHAT “LIVE” MEANS</div>
        <p>A real source was open when checked. We check again before you act.</p>
        <strong>${planner.candidateCount}</strong><span>open source candidate${planner.candidateCount === 1 ? "" : "s"}</span>
      </section>
      <p class="mt-lrp-request-status" aria-live="polite">${escapeHtml(requestMessage)}</p>
      ${renderComparisonDialog()}
      ${renderInterviewDialog()}
    </aside>`;
  }

  function patchPlanSurface() {
    let grid = document.querySelector(".plan-grid");
    if (!grid) {
      const mount = document.querySelector("[data-mt-live-route-planner]");
      if (!mount) return false;
      mount.innerHTML = `<div class="plan-grid" data-mt-live-route-planner="loading">
        <aside class="panel plan-control"></aside>
        <main><section class="panel route"></section></main>
        <aside class="stack"></aside>
      </div>`;
      grid = mount.querySelector(".plan-grid");
    }
    if (!grid) return false;
    if (
      grid.getAttribute("data-mt-live-route-revision") === String(renderRevision) &&
      grid.querySelector("[data-mt-live-route-results]")
    ) {
      return true;
    }

    const composer =
      grid.querySelector("[data-mt-live-route-composer]") || grid.querySelector(".plan-control");
    const route = grid.querySelector(".route");
    const tools =
      grid.querySelector("[data-mt-live-route-tools]") || grid.querySelector(":scope > aside.stack");
    if (!composer || !route || !tools) return false;

    grid.classList.add("mt-lrp-layout");
    grid.setAttribute("data-mt-live-route-planner", "true");
    grid.setAttribute("data-mt-live-route-revision", String(renderRevision));

    const replacementComposer = document.createRange().createContextualFragment(renderComposer());
    composer.replaceWith(replacementComposer);

    route.classList.add("mt-lrp-results");
    route.setAttribute("data-mt-live-route-panel", "true");
    route.innerHTML = renderResults();

    const replacementTools = document.createRange().createContextualFragment(renderTools());
    tools.replaceWith(replacementTools);

    const page = grid.parentElement;
    if (page) {
      page.querySelectorAll(":scope > .alloc").forEach((allocation) => {
        allocation.hidden = true;
        allocation.setAttribute("data-mt-live-route-legacy", "true");
      });
    }
    syncComposerConditionals(grid);
    return true;
  }

  function schedulePatch() {
    if (observerQueued) return;
    observerQueued = true;
    queueMicrotask(() => {
      observerQueued = false;
      patchPlanSurface();
    });
  }

  function rerender() {
    renderRevision += 1;
    patchPlanSurface();
  }

  function syncComposerConditionals(scope = document) {
    const form = scope.querySelector("[data-mt-lrp-profile-form]");
    if (!form) return;
    const redirect = form.querySelector('input[name="routeFormat"][value="redirect"]');
    const donationFields = form.querySelector("[data-mt-lrp-donation-fields]");
    if (donationFields) {
      const forced = donationFields.getAttribute("data-force-visible") === "true";
      donationFields.hidden = !(forced || redirect?.checked);
    }
    const donationBaseline = form.elements.plannedDonationBaseline;
    const amount = form.querySelector("[data-mt-lrp-donation-amount]");
    if (amount) amount.hidden = donationBaseline?.value !== "yes";
  }

  function profilePayload(form) {
    const data = new FormData(form);
    const goal = string(data.get("goal"), 180);
    const causePriority = string(data.get("causePriority"), 120);
    const routeFormats = data
      .getAll("routeFormat")
      .map((value) => string(value, 24))
      .filter((value) => FORMAT_VALUES.has(value));
    const baselineSelection = string(data.get("plannedDonationBaseline"), 10);
    const plannedDonationBaseline = baselineSelection === ""
      ? null
      : baselineSelection === "yes";
    return {
      goal,
      causePriorities: causePriority ? [causePriority] : [],
      moneyBudgetCents: Math.round(Math.max(0, Number(data.get("moneyBudget")) || 0) * 100),
      timeBudgetMinutes: integer(data.get("timeBudgetMinutes"), 0, 0, 100_000),
      actionBudgetCount: integer(data.get("actionBudgetCount"), 0, 0, 1_000),
      horizon: enumValue(
        data.get("horizon"),
        new Set(["day", "week", "month", "quarter", "year"]),
        "month",
      ),
      routeFormats,
      evidencePreference: planner.profile.evidencePreference,
      uncertaintyPreference: planner.profile.uncertaintyPreference,
      interactionPreference: planner.profile.interactionPreference,
      privacyPreference: planner.profile.privacyPreference,
      plannedDonationBaseline,
      plannedDonationCents: plannedDonationBaseline === true
        ? Math.round(Math.max(0, Number(data.get("plannedDonation")) || 0) * 100)
        : 0,
      otherwiseBaseline: string(data.get("otherwiseBaseline"), 700),
    };
  }

  async function postAction(payload, successMessage) {
    if (busy) return;
    busy = true;
    requestError = "";
    requestMessage = "Saving private route preferences…";
    rerender();

    let preferencesSaved = false;
    try {
      const response = await fetch(PROFILE_ENDPOINT, {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(string(body.error, 220) || "Route preferences could not be saved.");
      }
      preferencesSaved = true;

      const freshResponse = await fetch(LIVE_NOW_ENDPOINT, {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!freshResponse.ok) throw new Error("Routes could not be refreshed.");
      const fresh = await freshResponse.json();
      if (!fresh || typeof fresh !== "object" || !fresh.routePlanner) {
        throw new Error("The refreshed route plan was unavailable.");
      }
      window.__MT_LIVE_NOW_BOOTSTRAP__ = fresh;
      planner = normalizePlanner(fresh.routePlanner);
      requestMessage = successMessage;
      window.dispatchEvent(
        new CustomEvent("mt:live-route-planner-updated", { detail: { routePlanner: planner } }),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Route preferences could not be saved.";
      requestError = preferencesSaved
        ? `Your preferences may have saved, but the routes could not be refreshed. ${detail}`
        : detail;
      requestMessage = "";
    } finally {
      busy = false;
      rerender();
    }
  }

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    const focusTarget = dialog.querySelector("input, textarea, select, button");
    if (focusTarget instanceof HTMLElement) focusTarget.focus();
  }

  function closeDialog(control) {
    const dialog = control?.closest("dialog") || document.querySelector("dialog[open]");
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function interviewDraft(form) {
    const data = new FormData(form);
    const causePriority = string(data.get("causePriority"), 120);
    return {
      goal: string(data.get("goal"), 180),
      causePriorities: causePriority ? [causePriority] : [],
      otherwiseBaseline: string(data.get("otherwiseBaseline"), 700),
      evidencePreference: string(data.get("evidencePreference"), 40),
      uncertaintyPreference: string(data.get("uncertaintyPreference"), 40),
      interactionPreference: string(data.get("interactionPreference"), 40),
      privacyPreference: string(data.get("privacyPreference"), 40),
    };
  }

  function showInterviewReview(form) {
    if (!form.reportValidity()) return;
    const draft = interviewDraft(form);
    form.__mtLiveRouteInterviewDraft = draft;
    Object.entries(draft).forEach(([key, value]) => {
      const output = form.querySelector(`[data-mt-lrp-review="${key}"]`);
      if (output) output.textContent = value || "None stated";
    });
    form.querySelector("[data-mt-lrp-interview-edit]").hidden = true;
    form.querySelector("[data-mt-lrp-interview-review]").hidden = false;
    form.querySelector('[data-mt-lrp-action="confirm-interview"]')?.focus();
  }

  document.addEventListener("change", (event) => {
    if (!(event.target instanceof Element)) return;
    if (
      event.target.matches('input[name="routeFormat"]') ||
      event.target.matches('[name="plannedDonationBaseline"]')
    ) {
      syncComposerConditionals();
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.matches("[data-mt-lrp-profile-form]")) {
      event.preventDefault();
      const profile = profilePayload(form);
      const error = form.querySelector("[data-mt-lrp-form-error]");
      if (!form.reportValidity()) return;
      if (!profile.routeFormats.length) {
        if (error) error.textContent = "Choose at least one way to help.";
        return;
      }
      if (error) error.textContent = "";
      postAction({ action: "save_profile", profile }, "Routes updated from live sources.");
      return;
    }

    if (form.matches("[data-mt-lrp-interview-form]")) {
      event.preventDefault();
      showInterviewReview(form);
    }
  });

  document.addEventListener("click", (event) => {
    const control = event.target instanceof Element
      ? event.target.closest("button, a")
      : null;
    if (!control) return;

    const comparisonChoice = control.getAttribute("data-mt-lrp-comparison-choice");
    if (comparisonChoice && planner.comparison) {
      event.preventDefault();
      const comparison = planner.comparison;
      closeDialog(control);
      postAction(
        {
          action: "answer_comparison",
          answer: {
            key: comparison.key,
            leftFormat: comparison.left.format,
            rightFormat: comparison.right.format,
            choice: comparisonChoice,
          },
        },
        "Preference saved. Routes refreshed.",
      );
      return;
    }

    const action = control.getAttribute("data-mt-lrp-action");
    if (!action) return;
    if (action === "open-comparison") openDialog("mt-lrp-comparison-dialog");
    if (action === "open-interview") openDialog("mt-lrp-interview-dialog");
    if (action === "close-dialog") closeDialog(control);
    if (action === "reset-calibration") {
      postAction({ action: "reset_calibration" }, "Comparisons reset. Routes refreshed.");
    }
    if (action === "edit-interview") {
      const form = control.closest("form");
      form.querySelector("[data-mt-lrp-interview-edit]").hidden = false;
      form.querySelector("[data-mt-lrp-interview-review]").hidden = true;
      form.querySelector('[name="goal"]')?.focus();
    }
    if (action === "confirm-interview") {
      const form = control.closest("form");
      const draft = form?.__mtLiveRouteInterviewDraft;
      if (!draft) return;
      closeDialog(control);
      postAction(
        { action: "save_interview", interview: draft },
        "Interview confirmed. Routes refreshed.",
      );
    }
  });

  installStyles();
  schedulePatch();
  const observer = new MutationObserver(schedulePatch);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
