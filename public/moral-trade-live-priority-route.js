(function enforceNowPriorityRoute() {
  "use strict";

  if (window.__MT_LIVE_NOW_PRIORITY_ROUTE_ACTIVE__) return;
  window.__MT_LIVE_NOW_PRIORITY_ROUTE_ACTIVE__ = true;

  const profilePriorityHref =
    "/profile/priorities?returnTo=%2Fmoral-trade-live.html%23now";
  const originalNowFocus = window.nowFocus;
  if (typeof originalNowFocus !== "function") return;

  window.nowFocus = function renderNowWithPriorityRoute(...args) {
    const html = String(originalNowFocus.apply(this, args));
    return html.replaceAll('href="/complete-profile"', `href="${profilePriorityHref}"`);
  };

  if (typeof window.render === "function") {
    window.render();
  }
})();
