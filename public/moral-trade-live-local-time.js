(function localizeLiveDateAndGreeting() {
  "use strict";

  if (window.__MT_LOCAL_DATE_TIME__) return;
  window.__MT_LOCAL_DATE_TIME__ = true;

  const DOCUMENT_HEADING = "Current opportunities and next actions";
  const REVIEW_BOUNDARY =
    "Recommendations to review — not agreements, commitments, payments, or verified outcomes.";
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const greetingPattern = /^Good (?:morning|afternoon|evening)(.*)$/i;
  let refreshScheduled = false;

  function getLocalDateTimeAttribute(now) {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getTimeOfDayGreeting(hour) {
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  function getOrCreateTimeElement(container) {
    const existing = container.querySelector('time[data-mt-local-date="true"]');
    if (existing) return existing;

    const dateTextNode = Array.from(container.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && String(node.textContent || "").trim(),
    );
    if (!dateTextNode) return null;

    const time = document.createElement("time");
    time.setAttribute("data-mt-local-date", "true");
    dateTextNode.replaceWith(time);
    return time;
  }

  function updateGreeting(container, timeOfDayGreeting) {
    const greeting = container.querySelector("span.muted");
    if (!greeting) return;

    const match = String(greeting.textContent || "").trim().match(greetingPattern);
    if (!match) return;

    const suffix = match[1] || ".";
    const nextGreeting = `${timeOfDayGreeting}${suffix}`;
    if (greeting.textContent !== nextGreeting) greeting.textContent = nextGreeting;
    greeting.setAttribute("data-mt-local-greeting", "true");
  }

  function refreshLocalDateAndGreeting() {
    const now = new Date();
    const dateLabel = dateFormatter.format(now);
    const dateTime = getLocalDateTimeAttribute(now);
    const timeOfDayGreeting = getTimeOfDayGreeting(now.getHours());

    document.querySelectorAll(".head .date").forEach((container) => {
      const time = getOrCreateTimeElement(container);
      if (time) {
        if (time.dateTime !== dateTime) time.dateTime = dateTime;
        if (time.textContent !== dateLabel) time.textContent = dateLabel;
      }

      updateGreeting(container, timeOfDayGreeting);
      container.setAttribute("data-mt-local-date-time", dateTime);
    });
  }

  function refreshTruthBoundary() {
    const documentHeading = document.getElementById("mt-live-document-heading");
    if (documentHeading && documentHeading.textContent !== DOCUMENT_HEADING) {
      documentHeading.textContent = DOCUMENT_HEADING;
    }

    const boundarySelector = '[data-mt-now-review-boundary="true"]';
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
      boundary.setAttribute("data-mt-now-review-boundary", "true");
      boundary.setAttribute("role", "note");
      boundary.setAttribute("aria-label", "Recommendation status");
      Object.assign(boundary.style, {
        margin: "8px 0 0",
        padding: "9px 12px",
        border: "1px solid rgba(17, 17, 17, 0.16)",
        borderLeft: "3px solid #1648ff",
        background: "#fffef9",
        color: "#3d3a35",
        fontSize: "11px",
        lineHeight: "1.45",
      });
      toolbar.insertAdjacentElement("afterend", boundary);
    }

    if (boundary.textContent !== REVIEW_BOUNDARY) boundary.textContent = REVIEW_BOUNDARY;
  }

  function scheduleRefresh() {
    if (refreshScheduled) return;
    refreshScheduled = true;
    window.requestAnimationFrame(() => {
      refreshScheduled = false;
      refreshLocalDateAndGreeting();
      refreshTruthBoundary();
    });
  }

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("focus", scheduleRefresh);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleRefresh();
  });
  window.setInterval(scheduleRefresh, 60_000);

  scheduleRefresh();
})();
