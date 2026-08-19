(function exposeAuthenticatedFeedIdentity() {
  "use strict";

  if (window.__MT_LIVE_FEED_IDENTITY_ACTIVE__) return;
  window.__MT_LIVE_FEED_IDENTITY_ACTIVE__ = true;

  const ALLOWED_TYPES = new Set(["offer", "donation_redirect", "donation_pool"]);

  function text(value, maximum) {
    return typeof value === "string" ? value.trim().slice(0, maximum) : "";
  }

  function readFeedItems() {
    const bootstrap =
      window.__MT_LIVE_NOW_BOOTSTRAP__ &&
      typeof window.__MT_LIVE_NOW_BOOTSTRAP__ === "object"
        ? window.__MT_LIVE_NOW_BOOTSTRAP__
        : {};
    const recommendations = Array.isArray(bootstrap.recommendations)
      ? bootstrap.recommendations
      : [];
    const items = new Map();

    for (const recommendation of recommendations) {
      if (!recommendation || typeof recommendation !== "object") continue;
      const id = text(recommendation.id, 160);
      const opportunityType = text(recommendation.opportunityType, 40);
      const exposureRequestId = text(recommendation.exposureRequestId, 160);
      if (!id || !ALLOWED_TYPES.has(opportunityType) || !exposureRequestId) continue;

      const feedItemKey = `${opportunityType}:${id}`;
      items.set(feedItemKey, {
        exposureRequestId,
        feedItemKey,
        id,
        opportunityType,
      });
    }

    return items;
  }

  const feedItems = readFeedItems();

  function apply() {
    document
      .querySelectorAll(".mt-feed-card[data-opportunity-id][data-opportunity-type]")
      .forEach((card) => {
        const id = text(card.getAttribute("data-opportunity-id"), 160);
        const opportunityType = text(card.getAttribute("data-opportunity-type"), 40);
        const item = feedItems.get(`${opportunityType}:${id}`);
        if (!item) return;

        card.setAttribute("data-feed-item-id", item.id);
        card.setAttribute("data-feed-item-key", item.feedItemKey);
        card.setAttribute("data-exposure-request-id", item.exposureRequestId);
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
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  schedule();
})();
