(function enforceNowProfilePriorityRoute() {
  "use strict";

  if (window.__MT_LIVE_NOW_PRIORITY_ROUTE_ACTIVE__) return;
  window.__MT_LIVE_NOW_PRIORITY_ROUTE_ACTIVE__ = true;

  function profilePriorityHref() {
    const pathname = window.location.pathname;
    const returnTo = pathname === "/feed" ? "/feed" : pathname === "/" ? "/" : "/moral-trade-live.html#now";
    return `/profile/priorities?returnTo=${encodeURIComponent(returnTo)}`;
  }

  function routeProfilePriorityActions(html) {
    const href = profilePriorityHref();
    return String(html)
      .replaceAll(
        'href="/complete-profile">Adjust priorities →',
        `href="${href}">Adjust priorities →`,
      )
      .replaceAll(
        'href="/complete-profile">Edit priorities →',
        `href="${href}">Edit priorities →`,
      )
      .replaceAll(
        'href="/profile/priorities?returnTo=%2Fmoral-trade-live.html%23now">Adjust priorities →',
        `href="${href}">Adjust priorities →`,
      )
      .replaceAll(
        'href="/profile/priorities?returnTo=%2Fmoral-trade-live.html%23now">Edit priorities →',
        `href="${href}">Edit priorities →`,
      );
  }

  const originalNowFocus = window.nowFocus;
  if (typeof originalNowFocus !== "function") return;

  window.nowFocus = function renderNowWithProfilePriorityRoute(...args) {
    return routeProfilePriorityActions(originalNowFocus.apply(this, args));
  };

  if (typeof window.render === "function") {
    window.render();
  }
})();
