(function enforceLiveNowTruthBoundary() {
  "use strict";

  if (window.__MT_LIVE_NOW_TRUTH_BOUNDARY__) return;
  window.__MT_LIVE_NOW_TRUTH_BOUNDARY__ = true;

  const DOCUMENT_HEADING = "Current opportunities and next actions";
  const REVIEW_BOUNDARY =
    "Recommendations to review — not agreements, commitments, payments, or verified outcomes.";
  const boundarySelector = '[data-mt-now-review-boundary="true"]';
  let refreshQueued = false;

  function refreshDocumentHeading() {
    const heading = document.getElementById("mt-live-document-heading");
    if (heading && heading.textContent !== DOCUMENT_HEADING) {
      heading.textContent = DOCUMENT_HEADING;
    }
  }

  function refreshReviewBoundary() {
    const readyRoot = document.querySelector(
      '[data-mt-live-now="adaptive"][data-mt-live-now-state="ready"]',
    );
    const existingBoundary = document.querySelector(boundarySelector);

    if (!readyRoot) {
      if (existingBoundary) existingBoundary.remove();
      return;
    }

    if (existingBoundary && !readyRoot.contains(existingBoundary)) {
      existingBoundary.remove();
    }

    const toolbar = readyRoot.querySelector(".mt-feed-toolbar");
    if (!toolbar) return;

    let boundary = readyRoot.querySelector(boundarySelector);
    if (!boundary) {
      boundary = document.createElement("div");
      boundary.className = "mt-now-review-boundary";
      boundary.setAttribute("data-mt-now-review-boundary", "true");
      boundary.setAttribute("role", "note");
      boundary.setAttribute("aria-label", "Recommendation status");
      toolbar.insertAdjacentElement("afterend", boundary);
    }

    if (boundary.textContent !== REVIEW_BOUNDARY) boundary.textContent = REVIEW_BOUNDARY;
  }

  function refresh() {
    refreshDocumentHeading();
    refreshReviewBoundary();
  }

  function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(() => {
      refreshQueued = false;
      refresh();
    });
  }

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("mt:live-now-ready", scheduleRefresh);
  refresh();
})();
