(function addAuthenticatedFeedCreateActions() {
  "use strict";

  if (window.__MT_FEED_CREATE_PHASE1_ACTIVE__) return;
  window.__MT_FEED_CREATE_PHASE1_ACTIVE__ = true;

  const bootstrap =
    window.__MT_LIVE_NOW_BOOTSTRAP__ &&
    typeof window.__MT_LIVE_NOW_BOOTSTRAP__ === "object"
      ? window.__MT_LIVE_NOW_BOOTSTRAP__
      : {};
  const diagnostics =
    bootstrap.learningDiagnostics && typeof bootstrap.learningDiagnostics === "object"
      ? bootstrap.learningDiagnostics
      : {};
  if (
    bootstrap.authenticated !== true ||
    bootstrap.status !== "ready" ||
    diagnostics.exposureWriteStatus !== "written"
  ) {
    return;
  }

  function text(value, maximum) {
    return typeof value === "string" ? value.trim().slice(0, maximum) : "";
  }

  function positiveInteger(value) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  function completeRecommendation(value) {
    if (!value || typeof value !== "object") return null;
    const metadata =
      value.metadata && typeof value.metadata === "object" && !Array.isArray(value.metadata)
        ? value.metadata
        : {};
    if (metadata.origin === "platform_generated") return null;

    const id = text(value.id, 160);
    const exposureRequestId = text(value.exposureRequestId, 160);
    const sourceRevision = positiveInteger(value.sourceRevision);
    if (
      value.opportunityType !== "offer" ||
      value.mode !== "pledge" ||
      !id ||
      !exposureRequestId ||
      !sourceRevision ||
      !text(value.ownerAlias, 100) ||
      !text(value.offeredCause, 180) ||
      !text(value.requestedCause, 180) ||
      !text(value.offerAction, 5000) ||
      !text(value.requestAction, 5000) ||
      !text(value.verification, 5000) ||
      !text(value.duration, 5000)
    ) {
      return null;
    }
    return {
      id,
      exposureRequestId,
      sourceRevision,
      ownerAlias: text(value.ownerAlias, 100),
      reason: text(value.reason, 240),
      reasonDetails: Array.isArray(value.reasonDetails)
        ? value.reasonDetails.map((item) => text(item, 240)).filter(Boolean).slice(0, 6)
        : [],
      paretoSuccess:
        Number.isFinite(Number(value.paretoPrediction?.paretoSuccess))
          ? Math.max(0, Math.min(1, Number(value.paretoPrediction.paretoSuccess)))
          : null,
      actionFitLabel: text(value.actionFitLabel, 40),
    };
  }

  const recommendations = new Map();
  (Array.isArray(bootstrap.recommendations) ? bootstrap.recommendations : []).forEach(
    (value) => {
      const recommendation = completeRecommendation(value);
      if (recommendation) recommendations.set(`offer:${recommendation.id}`, recommendation);
    },
  );
  if (!recommendations.size) return;

  function eventPayload(eventType, recommendation) {
    return {
      eventType,
      opportunityType: "offer",
      opportunityId: recommendation.id,
      exposureRequestId: recommendation.exposureRequestId,
      sourceRevision: recommendation.sourceRevision,
    };
  }

  function record(eventType, recommendation) {
    if (typeof fetch !== "function") return;
    void fetch("/api/feed-create/events", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventPayload(eventType, recommendation)),
    }).catch(() => null);
  }

  function contextStorageKey(recommendation) {
    return [
      "moral_trade_feed_create_context_v1",
      recommendation.exposureRequestId,
      "offer",
      recommendation.id,
      recommendation.sourceRevision,
    ].join(":");
  }

  function storeTransientMatchContext(recommendation) {
    try {
      sessionStorage.setItem(
        contextStorageKey(recommendation),
        JSON.stringify({
          createdAt: Date.now(),
          ownerAlias: recommendation.ownerAlias,
          reason: recommendation.reason,
          reasonDetails: recommendation.reasonDetails,
          matchPercent:
            recommendation.paretoSuccess === null
              ? null
              : Math.round(recommendation.paretoSuccess * 100),
          actionFitLabel: recommendation.actionFitLabel,
        }),
      );
    } catch {
      // Match context is optional and intentionally session-only.
    }
  }

  function createHref(recommendation) {
    const query = new URLSearchParams({
      fromFeed: "1",
      sourceType: "offer",
      sourceId: recommendation.id,
      exposureRequestId: recommendation.exposureRequestId,
      sourceRevision: String(recommendation.sourceRevision),
    });
    return `/trades/new?${query.toString()}`;
  }

  function apply() {
    document
      .querySelectorAll(".mt-feed-card[data-opportunity-type='offer'][data-opportunity-id]")
      .forEach((card) => {
        if (!(card instanceof HTMLElement) || card.dataset.feedCreateBound === "true") return;
        const recommendation = recommendations.get(
          `offer:${text(card.dataset.opportunityId, 160)}`,
        );
        if (!recommendation) return;
        const actions = card.querySelector(".mt-feed-actions");
        if (!actions) return;

        const link = document.createElement("a");
        link.className = "btn mt-feed-create-action";
        link.href = createHref(recommendation);
        link.dataset.action = "create-from-feed";
        link.dataset.feedItemKey = `offer:${recommendation.id}`;
        link.dataset.exposureRequestId = recommendation.exposureRequestId;
        link.textContent = "Create a trade from this";
        link.addEventListener("click", () => {
          storeTransientMatchContext(recommendation);
          record("action_clicked", recommendation);
        });
        actions.insertBefore(link, actions.firstChild?.nextSibling ?? null);
        card.dataset.feedCreateBound = "true";
        record("action_shown", recommendation);
      });
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      apply();
    });
  }

  window.addEventListener("mt:live-now-ready", schedule);
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  schedule();
})();
