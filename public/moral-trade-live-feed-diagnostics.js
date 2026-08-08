(function enhanceReciprocalFeed() {
  "use strict";

  if (window.__MT_RECIPROCAL_FEED_DIAGNOSTICS_ACTIVE__) return;
  window.__MT_RECIPROCAL_FEED_DIAGNOSTICS_ACTIVE__ = true;

  const classOrder = ["direct", "near", "adjacent", "discovery"];
  const classCopy = {
    direct: {
      label: "Direct match",
      title: "Direct matches",
      description: "Clear the current reciprocal, feasibility, and substantive-fit thresholds.",
    },
    near: {
      label: "Near-match",
      title: "Promising near-matches",
      description: "Relevant and potentially workable, but at least one direct-match estimate remains uncertain.",
    },
    adjacent: {
      label: "Adjacent",
      title: "Adjacent opportunities",
      description: "Connected to a priority, without an established reciprocal fit.",
    },
    discovery: {
      label: "Discovery",
      title: "Discovery",
      description: "Deliberate exploration used to learn your preferences; these are not presented as matches.",
    },
  };
  const blockerLabels = {
    payment_disabled: "Payment routes excluded",
    pledge_disabled: "Pledge routes excluded",
    hidden_by_user: "Previously hidden",
    incomplete_public_terms: "Incomplete public terms",
    outside_retrieval_pool: "Outside this retrieval batch",
    low_substantive_compatibility: "Low substantive compatibility",
    low_user_acceptance: "Requested action may not work for you",
    low_counterparty_acceptance: "Counterparty acceptance uncertain",
    low_completion_confidence: "Completion confidence too low",
    not_executable: "Not executable",
    route_format: "Route format excluded",
    money_budget: "Above money limit",
    time_budget: "Above time limit",
    action_budget: "Above action limit",
    horizon: "Outside time horizon",
    evidence: "Evidence level too low",
    interaction: "Interaction preference mismatch",
    uncertainty: "Uncertainty preference mismatch",
    privacy: "Privacy preference mismatch",
    already_planned: "Already in the no-trade baseline",
    planned_donation_baseline: "Planned-donation baseline missing",
    planned_donation_amount: "Planned-donation amount incompatible",
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function finiteCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
  }

  function bootstrap() {
    const value = window.__MT_LIVE_NOW_BOOTSTRAP__;
    return value && typeof value === "object" ? value : {};
  }

  function diagnostics() {
    const value = bootstrap().feedDiagnostics;
    return value && typeof value === "object" ? value : null;
  }

  function recommendationsById() {
    const result = new Map();
    const values = Array.isArray(bootstrap().recommendations) ? bootstrap().recommendations : [];
    values.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const id = typeof item.id === "string" ? item.id : "";
      const opportunityType = typeof item.opportunityType === "string" ? item.opportunityType : "offer";
      if (id) result.set(`${opportunityType}:${id}`, item);
    });
    return result;
  }

  function modeLabel(mode) {
    if (mode === "openai") return "Public semantic embeddings";
    if (mode === "openai_cache") return "Cached public semantic embeddings";
    if (mode === "deterministic_fallback") return "Local semantic fallback";
    return "Local lexical matching";
  }

  function diagnosticRows(data) {
    const externalSemantics = data.inventorySemanticsVersion === "external-candidate-funnel-v1";
    if (externalSemantics) {
      return [
        ["Platform live inventory", finiteCount(data.platformInventoryCount)],
        ["Your listings excluded", finiteCount(data.viewerOwnedExcludedCount)],
        ["External opportunities available", finiteCount(data.externalInventoryCount)],
        ["Candidates evaluated", finiteCount(data.evaluatedCandidateCount)],
        ["Hard-eligible", finiteCount(data.eligibleCount)],
        ["Semantic retrieval pool", finiteCount(data.retrievalPoolCount)],
        ["Semantically relevant", finiteCount(data.semanticCandidateCount)],
        ["Direct matches", finiteCount(data.directCount)],
        ["Near-matches", finiteCount(data.nearMatchCount)],
        ["Adjacent", finiteCount(data.adjacentCount)],
        ["Discovery", finiteCount(data.discoveryCount)],
        ["Shown in this batch", finiteCount(data.selectedCount)],
      ];
    }
    return [
      ["External candidates evaluated", finiteCount(data.checkedInventoryCount)],
      ["Hard-eligible", finiteCount(data.eligibleCount)],
      ["Semantic retrieval pool", finiteCount(data.retrievalPoolCount)],
      ["Semantically relevant", finiteCount(data.semanticCandidateCount)],
      ["Direct matches", finiteCount(data.directCount)],
      ["Near-matches", finiteCount(data.nearMatchCount)],
      ["Adjacent", finiteCount(data.adjacentCount)],
      ["Discovery", finiteCount(data.discoveryCount)],
      ["Shown in this batch", finiteCount(data.selectedCount)],
    ];
  }

  function blockerChips(data) {
    const entries = [];
    for (const source of [data.excludedByReason, data.softBlockers, data.knownConstraintBlockers]) {
      if (!source || typeof source !== "object") continue;
      Object.entries(source).forEach(([key, rawCount]) => {
        const count = finiteCount(rawCount);
        if (!count) return;
        entries.push([blockerLabels[key] || key.replaceAll("_", " "), count]);
      });
    }
    entries.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
    if (!entries.length) return '<span class="mt-feed-diagnostic-chip">No recorded blockers</span>';
    return entries
      .slice(0, 6)
      .map(([label, count]) => `<span class="mt-feed-diagnostic-chip">${escapeHtml(label)} <b>${escapeHtml(count)}</b></span>`)
      .join("");
  }

  function readyDiagnosticsMarkup(data) {
    const rows = diagnosticRows(data);
    const coverage = finiteCount(data.embeddingCoveragePercent);
    const external = finiteCount(data.externalInventoryCount ?? data.checkedInventoryCount);
    const evaluated = finiteCount(data.evaluatedCandidateCount ?? data.checkedInventoryCount);
    return `<section class="mt-feed-diagnostics" aria-label="Recommendation matching diagnostics">
      <div class="mt-feed-diagnostics-head">
        <div><div class="eyebrow blue">External candidate funnel</div><h3>${escapeHtml(external)} external opportunities available · ${escapeHtml(evaluated)} evaluated</h3></div>
        <div class="mt-feed-diagnostics-summary" aria-label="Feed class counts">
          <span><b>${escapeHtml(data.directCount || 0)}</b> direct</span>
          <span><b>${escapeHtml(data.nearMatchCount || 0)}</b> near</span>
          <span><b>${escapeHtml(data.adjacentCount || 0)}</b> adjacent</span>
          <span><b>${escapeHtml(data.discoveryCount || 0)}</b> discovery</span>
        </div>
      </div>
      <details class="mt-feed-diagnostics-details">
        <summary>How this batch was built <span aria-hidden="true">＋</span></summary>
        <div class="mt-feed-diagnostics-grid">
          <ol>${rows.map(([label, count]) => `<li><span>${escapeHtml(label)}</span><b>${escapeHtml(count)}</b></li>`).join("")}</ol>
          <div><p><b>${escapeHtml(modeLabel(data.retrievalMode))}</b> · ${escapeHtml(coverage)}% of the retrieval pool represented in the semantic vector space.</p>
          <div class="mt-feed-diagnostic-chips">${blockerChips(data)}</div>
          <p class="mt-feed-diagnostics-privacy">Only public opportunity text and fixed public cause concepts may be sent to the embedding provider. Private profile prose stays inside Moral Trade.</p></div>
        </div>
      </details>
    </section>`;
  }

  function addClassHeadings(feed, cards, byId) {
    feed.querySelectorAll(".mt-feed-class-heading").forEach((element) => element.remove());
    const displayedCounts = new Map(classOrder.map((matchClass) => [matchClass, 0]));
    cards.forEach((card) => {
      const id = card.getAttribute("data-opportunity-id") || "";
      const type = card.getAttribute("data-opportunity-type") || "offer";
      const recommendation = byId.get(`${type}:${id}`);
      const matchClass = classOrder.includes(recommendation?.matchClass) ? recommendation.matchClass : "direct";
      displayedCounts.set(matchClass, (displayedCounts.get(matchClass) || 0) + 1);
    });
    const shown = new Set();
    cards.forEach((card) => {
      const id = card.getAttribute("data-opportunity-id") || "";
      const type = card.getAttribute("data-opportunity-type") || "offer";
      const recommendation = byId.get(`${type}:${id}`);
      const matchClass = classOrder.includes(recommendation?.matchClass) ? recommendation.matchClass : "direct";
      card.dataset.matchClass = matchClass;
      card.classList.add(`mt-feed-match--${matchClass}`);
      const copy = classCopy[matchClass];
      const head = card.querySelector(".mt-feed-card-head");
      if (head && !head.querySelector(".mt-feed-match-badge")) {
        const badge = document.createElement("span");
        badge.className = `mt-feed-match-badge mt-feed-match-badge--${matchClass}`;
        badge.textContent = copy.label;
        const ownerLine = head.querySelector(".mt-feed-owner-line");
        if (ownerLine) ownerLine.insertAdjacentElement("afterend", badge);
        else head.appendChild(badge);
      }
      const detailsSummary = card.querySelector(".mt-feed-details > summary");
      if (detailsSummary) {
        const suffix = detailsSummary.querySelector("span")?.outerHTML || '<span aria-hidden="true">＋</span>';
        detailsSummary.innerHTML = `${matchClass === "discovery" ? "Why this is shown" : `Why this ${copy.label.toLowerCase()}`} ${suffix}`;
      }
      if (!shown.has(matchClass)) {
        shown.add(matchClass);
        const heading = document.createElement("header");
        heading.className = `mt-feed-class-heading mt-feed-class-heading--${matchClass}`;
        const total = finiteCount(displayedCounts.get(matchClass));
        heading.innerHTML = `<div><span>${escapeHtml(copy.label)}</span><h3>${escapeHtml(copy.title)}</h3><p>${escapeHtml(copy.description)}</p></div><b>${escapeHtml(total)}</b>`;
        card.insertAdjacentElement("beforebegin", heading);
      }
    });
  }

  function enhanceReady(root, data) {
    const feed = root.querySelector(".mt-social-feed");
    const toolbar = root.querySelector(".mt-feed-toolbar");
    if (!feed || !toolbar) return;
    const cardIds = [...feed.querySelectorAll(".mt-feed-card[data-opportunity-id]")]
      .map((card) => `${card.getAttribute("data-opportunity-id") || ""}:${card.hasAttribute("hidden") ? "hidden" : "shown"}`)
      .join("|");
    const signature = `ready:${String(data.checkedAt || "")}:${cardIds}`;
    if (root.dataset.reciprocalDiagnostics === signature) return;
    if (!root.querySelector(".mt-feed-diagnostics")) toolbar.insertAdjacentHTML("afterend", readyDiagnosticsMarkup(data));
    const toolbarTitle = toolbar.querySelector(".mt-feed-toolbar-title h2");
    if (toolbarTitle && !toolbarTitle.dataset.reciprocalTitle) {
      toolbarTitle.dataset.reciprocalTitle = "true";
      toolbarTitle.innerHTML = `Matches and discovery <span>${escapeHtml(finiteCount(data.selectedCount))}</span>`;
    }
    const cards = [...feed.querySelectorAll(".mt-feed-card[data-opportunity-id]:not([hidden])")];
    addClassHeadings(feed, cards, recommendationsById());
    root.dataset.reciprocalDiagnostics = signature;
  }

  function emptyDiagnosticsMarkup(data) {
    const rows = diagnosticRows(data);
    return `<details class="mt-feed-empty-diagnostics">
      <summary>See the external candidate funnel <span aria-hidden="true">＋</span></summary>
      <div><ol>${rows.slice(0, 7).map(([label, count]) => `<li><span>${escapeHtml(label)}</span><b>${escapeHtml(count)}</b></li>`).join("")}</ol><div class="mt-feed-diagnostic-chips">${blockerChips(data)}</div>
        <p>Retrieval: ${escapeHtml(modeLabel(data.retrievalMode))}. Private profile prose was not sent to the embedding provider.</p></div>
    </details>`;
  }

  function enhanceEmpty(root, data) {
    const urgent = root.querySelector(".panel.black.urgent");
    if (!urgent) return;
    const platform = finiteCount(data.platformInventoryCount);
    const owned = finiteCount(data.viewerOwnedExcludedCount);
    const external = finiteCount(data.externalInventoryCount ?? data.checkedInventoryCount);
    const evaluated = finiteCount(data.evaluatedCandidateCount ?? data.checkedInventoryCount);
    const signature = `empty:${String(data.checkedAt || "")}:${platform}:${owned}:${external}:${evaluated}`;
    if (root.dataset.reciprocalDiagnostics === signature) return;
    const title = urgent.querySelector("h2");
    const copy = urgent.querySelector("p.muted");
    const facts = urgent.querySelectorAll(".terms strong");

    if (data.inventorySemanticsVersion === "external-candidate-funnel-v1" && external === 0) {
      if (title) title.textContent = "No external opportunities are available yet.";
      if (copy) {
        copy.textContent = platform
          ? `The platform has ${platform} live opportunities. ${owned} belong to you and appear below; your own listings are not recommended back to you.`
          : "The platform currently has no live opportunities. No matching threshold was evaluated.";
      }
      if (facts[0]) facts[0].textContent = "0 external opportunities available";
      if (facts[1]) facts[1].textContent = "0 candidates evaluated";
    } else if (external > 0 && evaluated === 0) {
      if (title) title.textContent = "External opportunities exist, but none were eligible to evaluate.";
      if (copy) copy.textContent = `${external} external opportunities are live, but current mode, visibility, completeness, or feasibility rules excluded them before matching.`;
      if (facts[0]) facts[0].textContent = `${external} external opportunities available`;
      if (facts[1]) facts[1].textContent = "0 candidates evaluated";
    } else {
      if (title) title.textContent = "No direct match currently clears your criteria.";
      if (copy) copy.textContent = `We evaluated ${evaluated} external opportunities. None currently clears every reciprocal and feasibility threshold; relevant near-matches may still exist.`;
      if (facts[0]) facts[0].textContent = `${evaluated} external candidates evaluated`;
      if (facts[1]) facts[1].textContent = "0 direct matches";
    }

    if (!urgent.querySelector(".mt-feed-empty-diagnostics")) {
      const terms = urgent.querySelector(".terms");
      if (terms) terms.insertAdjacentHTML("afterend", emptyDiagnosticsMarkup(data));
    }
    root.dataset.reciprocalDiagnostics = signature;
  }

  function enhance() {
    const data = diagnostics();
    if (!data || data.version !== "hybrid-reciprocal-v1") return;
    const root = document.querySelector('[data-mt-live-now="adaptive"]');
    if (!root) return;
    const state = root.getAttribute("data-mt-live-now-state");
    if (state === "ready") enhanceReady(root, data);
    else if (state === "no_matches") enhanceEmpty(root, data);
  }

  let scheduled = false;
  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      enhance();
    });
  }

  window.addEventListener("mt:live-now-ready", scheduleEnhance);
  scheduleEnhance();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleEnhance, { once: true });
  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden"],
  });
})();
