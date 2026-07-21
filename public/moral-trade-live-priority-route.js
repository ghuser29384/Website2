(function enforceNowCompleteProfileRoute() {
  "use strict";

  if (window.__MT_LIVE_NOW_PRIORITY_ROUTE_ACTIVE__) return;
  window.__MT_LIVE_NOW_PRIORITY_ROUTE_ACTIVE__ = true;

  const completeProfileHref = "/complete-profile";
  const legacyPriorityHref =
    "/profile/priorities?returnTo=%2Fmoral-trade-live.html%23now";
  const originalNowFocus = window.nowFocus;
  if (typeof originalNowFocus !== "function") return;

  window.nowFocus = function renderNowWithCompleteProfileRoute(...args) {
    const html = String(originalNowFocus.apply(this, args));
    return html.replaceAll(
      `href="${legacyPriorityHref}"`,
      `href="${completeProfileHref}"`,
    );
  };

  if (typeof window.render === "function") {
    window.render();
  }
})();
