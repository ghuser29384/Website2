(function enhanceTradeBuilderWithAuthenticatedFeed() {
  "use strict";

  if (window.__MT_LIVE_TRADE_FEED_ACTIVE__) return;
  window.__MT_LIVE_TRADE_FEED_ACTIVE__ = true;

  const ROOT_SELECTOR = "[data-mt-live-trade-feed]";
  const ALLOWED_STATES = new Set([
    "no_matches",
    "profile_incomplete",
    "ready",
    "signed_out",
    "unavailable",
  ]);
  const ALLOWED_TYPES = new Set(["offer", "donation_redirect", "donation_pool"]);

  function text(value, maximum) {
    return typeof value === "string" ? value.trim().slice(0, maximum) : "";
  }

  function numeric(value, minimum, maximum) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(maximum, Math.max(minimum, parsed));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safePath(value, fallback) {
    const path = text(value, 500);
    return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
  }

  function uniqueStrings(values, maximumItems) {
    const seen = new Set();
    const output = [];
    for (const value of Array.isArray(values) ? values : []) {
      const cleaned = text(value, 120);
      const key = cleaned.toLowerCase();
      if (!cleaned || seen.has(key)) continue;
      seen.add(key);
      output.push(cleaned);
      if (output.length >= maximumItems) break;
    }
    return output;
  }

  function normalizeRecommendation(value) {
    if (!value || typeof value !== "object") return null;

    const id = text(value.id, 160);
    const opportunityType = text(value.opportunityType, 40);
    const exposureRequestId = text(value.exposureRequestId, 160);
    const offeredCause = text(value.offeredCause, 160);
    const requestedCause = text(value.requestedCause, 160);
    if (
      !id ||
      !ALLOWED_TYPES.has(opportunityType) ||
      !exposureRequestId ||
      !offeredCause ||
      !requestedCause
    ) {
      return null;
    }

    const fallbackHref =
      opportunityType === "donation_pool"
        ? `/donation-offsets?pool=${encodeURIComponent(id)}`
        : `/offers/${encodeURIComponent(id)}`;
    const prediction =
      value.paretoPrediction && typeof value.paretoPrediction === "object"
        ? value.paretoPrediction
        : {};
    const matchConfidence =
      numeric(value.matchConfidence, 0, 100) ??
      (() => {
        const paretoSuccess = numeric(prediction.paretoSuccess, 0, 1);
        return paretoSuccess === null ? null : Math.round(paretoSuccess * 100);
      })();

    return {
      id,
      feedItemKey: `${opportunityType}:${id}`,
      opportunityType,
      exposureRequestId,
      href: safePath(value.href, fallbackHref),
      ctaLabel: text(value.ctaLabel, 80) || "Review opportunity",
      sourceLabel: text(value.sourceLabel, 80) || "Feed opportunity",
      ownerAlias: text(value.ownerAlias, 100) || "Participant",
      offeredCause,
      requestedCause,
      offerAction: text(value.offerAction, 420),
      requestAction: text(value.requestAction, 420),
      verification: text(value.verification, 320),
      duration: text(value.duration, 160),
      reason: text(value.reason, 240),
      actionLabel: text(value.actionLabel, 160),
      actionFitLabel: text(value.actionFitLabel, 40),
      difficultyLabel: text(value.difficultyLabel, 40),
      matchCause: text(value.matchCause, 120),
      matchClass: text(value.matchClass, 40),
      matchConfidence,
      benefitCauses: uniqueStrings(value.benefitCauses, 6),
      actionCauses: uniqueStrings(value.actionCauses, 6),
    };
  }

  function readModel() {
    const bootstrap =
      window.__MT_LIVE_NOW_BOOTSTRAP__ &&
      typeof window.__MT_LIVE_NOW_BOOTSTRAP__ === "object"
        ? window.__MT_LIVE_NOW_BOOTSTRAP__
        : {};
    const rawRecommendations = Array.isArray(bootstrap.recommendations)
      ? bootstrap.recommendations
      : [];
    const recommendations = rawRecommendations
      .map(normalizeRecommendation)
      .filter(Boolean)
      .slice(0, 12);
    let status = ALLOWED_STATES.has(bootstrap.status) ? bootstrap.status : "unavailable";
    if (status === "ready" && rawRecommendations.length > 0 && recommendations.length === 0) {
      status = "unavailable";
    } else if (status === "ready" && recommendations.length === 0) {
      status = "no_matches";
    }

    return {
      authenticated: bootstrap.authenticated === true,
      status,
      recommendations,
      requestId: text(bootstrap.learningDiagnostics?.requestId, 160),
    };
  }

  function typeLabel(type) {
    if (type === "donation_redirect") return "Donation redirect";
    if (type === "donation_pool") return "Public-goods pool";
    return "Moral trade";
  }

  function classLabel(value) {
    if (value === "direct") return "Direct match";
    if (value === "near") return "Near-match";
    if (value === "adjacent") return "Adjacent opportunity";
    if (value === "discovery") return "Discovery";
    return "Feed-ranked opportunity";
  }

  function tagMarkup(recommendation) {
    return uniqueStrings(
      [
        recommendation.matchCause,
        recommendation.actionLabel,
        ...recommendation.benefitCauses,
        ...recommendation.actionCauses,
      ],
      2,
    )
      .map((label) => `<span class="tag">${escapeHtml(label)}</span>`)
      .join("");
  }

  function recommendationCard(recommendation, index) {
    const requestedAction = recommendation.requestAction || recommendation.requestedCause;
    const offeredOutcome = recommendation.offerAction || recommendation.offeredCause;
    const confidence = recommendation.matchConfidence;
    const confidenceMarkup =
      confidence === null
        ? ""
        : `<div class="score" aria-label="${escapeHtml(
            `${Math.round(confidence)} percent match confidence`,
          )}">${escapeHtml(`${Math.round(confidence)}%`)}</div>`;
    const evidenceMarkup = recommendation.verification
      ? `<p class="mt-trade-feed-evidence"><b>Evidence</b> ${escapeHtml(
          recommendation.verification,
        )}</p>`
      : "";
    const timingMarkup = recommendation.duration
      ? `<p class="mt-trade-feed-timing"><b>Timing</b> ${escapeHtml(
          recommendation.duration,
        )}</p>`
      : "";
    const reason =
      recommendation.reason ||
      `Ranked from your current Feed for ${recommendation.matchCause || recommendation.offeredCause}.`;

    return `<section class="panel matchcard mt-trade-feed-card" data-feed-item-id="${escapeHtml(
      recommendation.id,
    )}" data-feed-item-key="${escapeHtml(
      recommendation.feedItemKey,
    )}" data-opportunity-id="${escapeHtml(
      recommendation.id,
    )}" data-opportunity-type="${escapeHtml(
      recommendation.opportunityType,
    )}" data-exposure-request-id="${escapeHtml(recommendation.exposureRequestId)}">
      <div class="between"><div class="eyebrow">${
        index === 0 ? "Potential match" : `Feed opportunity ${index + 1}`
      }</div><a class="blue" href="/feed">View all</a></div>
      ${confidenceMarkup}
      <h3>${escapeHtml(recommendation.ownerAlias)}</h3>
      <span class="status"><i class="dot good"></i>${escapeHtml(
        `${classLabel(recommendation.matchClass)} · ${typeLabel(recommendation.opportunityType)}`,
      )}</span>
      <p class="mt-trade-feed-reason">${escapeHtml(reason)}</p>
      <dl class="mt-trade-feed-terms">
        <div><dt>You would do</dt><dd>${escapeHtml(requestedAction)}</dd></div>
        <div><dt>This advances</dt><dd>${escapeHtml(offeredOutcome)}</dd></div>
      </dl>
      ${evidenceMarkup}${timingMarkup}
      <div class="h mt-trade-feed-tags">${tagMarkup(recommendation)}</div>
      <a class="btn small mt-trade-feed-open" href="${escapeHtml(
        recommendation.href,
      )}">${escapeHtml(recommendation.ctaLabel)} →</a>
    </section>`;
  }

  function emptyState(model) {
    if (model.status === "signed_out" || !model.authenticated) {
      return {
        eyebrow: "Personal matches are private",
        title: "Sign in to load your Feed.",
        body: "No generic or demo records are substituted while signed out.",
        href: "/login?returnTo=%2F%23trade",
        label: "Sign in →",
      };
    }
    if (model.status === "profile_incomplete") {
      return {
        eyebrow: "Profile needs priorities",
        title: "Set priorities before matching.",
        body: "The Trade builder will show only opportunities selected from your authenticated Feed.",
        href: "/complete-profile",
        label: "Set priorities →",
      };
    }
    if (model.status === "no_matches") {
      return {
        eyebrow: "No current Feed match",
        title: "No personalized opportunity is available here yet.",
        body: "No filler suggestions were added. Browse live proposals or adjust your priorities.",
        href: "/feed",
        label: "Open full Feed →",
      };
    }
    return {
      eyebrow: "Personal matches unavailable",
      title: "Your Feed could not load.",
      body: "No generic or fabricated match, completed trade, or counteroffer is shown.",
      href: "/feed",
      label: "Try the full Feed →",
    };
  }

  function decorateFeedCards(model) {
    const recommendationsByKey = new Map(
      model.recommendations.map((recommendation) => [
        recommendation.feedItemKey,
        recommendation,
      ]),
    );
    document
      .querySelectorAll(".mt-feed-card[data-opportunity-id][data-opportunity-type]")
      .forEach((card) => {
        const id = text(card.getAttribute("data-opportunity-id"), 160);
        const opportunityType = text(card.getAttribute("data-opportunity-type"), 40);
        const recommendation = recommendationsByKey.get(`${opportunityType}:${id}`);
        if (!recommendation) return;
        card.setAttribute("data-feed-item-id", recommendation.id);
        card.setAttribute("data-feed-item-key", recommendation.feedItemKey);
        card.setAttribute("data-exposure-request-id", recommendation.exposureRequestId);
      });
  }

  function renderRoot(root, model) {
    const visibleRecommendations = model.recommendations.slice(0, 3);
    const signature = `${model.status}:${model.requestId}:${visibleRecommendations
      .map((item) => item.feedItemKey)
      .join(",")}`;
    if (root.getAttribute("data-mt-live-trade-feed-signature") === signature) return;

    root.setAttribute("data-mt-live-trade-feed", model.status);
    root.setAttribute("data-mt-live-trade-feed-signature", signature);
    root.setAttribute("aria-label", "Personalized Trade feed");

    if (model.status === "ready" && visibleRecommendations.length > 0) {
      root.innerHTML = visibleRecommendations
        .map((recommendation, index) => recommendationCard(recommendation, index))
        .join("");
      return;
    }

    const empty = emptyState(model);
    root.innerHTML = `<section class="panel matchcard mt-trade-feed-empty" aria-label="No personalized Trade feed item">
      <div class="eyebrow">${escapeHtml(empty.eyebrow)}</div>
      <h3>${escapeHtml(empty.title)}</h3>
      <p>${escapeHtml(empty.body)}</p>
      <a class="btn small" href="${escapeHtml(empty.href)}">${escapeHtml(empty.label)}</a>
    </section>`;
  }

  function enhance() {
    const model = readModel();
    decorateFeedCards(model);
    document.querySelectorAll(ROOT_SELECTOR).forEach((root) => renderRoot(root, model));
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      enhance();
    });
  }

  window.addEventListener("mt:live-now-ready", schedule);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  }
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  schedule();
})();
