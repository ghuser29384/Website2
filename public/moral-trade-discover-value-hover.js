(function installDelayedValueFieldLabels() {
  "use strict";

  if (window.__MT_DISCOVER_VALUE_HOVER_LABELS__) return;
  window.__MT_DISCOVER_VALUE_HOVER_LABELS__ = true;

  const HOVER_DELAY_MS = 500;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let hoverTimer = null;
  let pendingPoint = null;
  let activePoint = null;

  const style = document.createElement("style");
  style.setAttribute("data-mt-value-hover-style", "true");
  style.textContent = `
    .value-point {
      width: 24px !important;
      height: 24px !important;
    }

    .value-point .mark {
      margin: 4px !important;
    }

    .value-point .point-title,
    .value-point .point-meta {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      clip-path: inset(50%) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }

    .mt-value-hover-tooltip {
      position: fixed;
      z-index: 120;
      width: min(280px, calc(100vw - 24px));
      padding: 10px 12px;
      border: 1px solid #8d8c87;
      background: rgba(255, 254, 250, .98);
      color: #0b0b0a;
      box-shadow: 0 14px 34px rgba(20, 20, 18, .16);
      pointer-events: none;
      opacity: 1;
    }

    .mt-value-hover-tooltip[hidden] {
      display: none !important;
    }

    .mt-value-hover-tooltip strong {
      display: block;
      font: 600 13px/1.35 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .mt-value-hover-tooltip span {
      display: block;
      margin-top: 4px;
      color: #6f706f;
      font: 10.5px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    }

    @media (prefers-reduced-motion: reduce) {
      .mt-value-hover-tooltip { transition: none !important; }
    }
  `;
  document.head.appendChild(style);

  const tooltip = document.createElement("div");
  tooltip.className = "mt-value-hover-tooltip";
  tooltip.id = "mt-value-hover-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.appendChild(tooltip);

  function closestPoint(target) {
    return target instanceof Element ? target.closest(".value-point") : null;
  }

  function readPointText(point, selector) {
    return String(point.querySelector(selector)?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function clearHoverTimer() {
    if (hoverTimer !== null) {
      window.clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  }

  function positionTooltip(point) {
    if (tooltip.hidden || !point.isConnected) return;

    const pointRect = point.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const gap = 12;
    const edge = 12;

    let left = pointRect.right + gap;
    if (left + tooltipRect.width > window.innerWidth - edge) {
      left = pointRect.left - tooltipRect.width - gap;
    }
    left = Math.max(edge, Math.min(left, window.innerWidth - tooltipRect.width - edge));

    let top = pointRect.top + pointRect.height / 2 - tooltipRect.height / 2;
    top = Math.max(edge, Math.min(top, window.innerHeight - tooltipRect.height - edge));

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  }

  function showTooltip(point) {
    const title = readPointText(point, ".point-title");
    const meta = readPointText(point, ".point-meta");
    if (!title && !meta) return;

    if (activePoint && activePoint !== point) {
      activePoint.removeAttribute("aria-describedby");
    }

    tooltip.replaceChildren();
    if (title) {
      const titleElement = document.createElement("strong");
      titleElement.textContent = title;
      tooltip.appendChild(titleElement);
    }
    if (meta) {
      const metaElement = document.createElement("span");
      metaElement.textContent = meta;
      tooltip.appendChild(metaElement);
    }

    activePoint = point;
    point.setAttribute("aria-describedby", tooltip.id);
    tooltip.hidden = false;
    positionTooltip(point);
  }

  function hideTooltip(point = activePoint) {
    if (point) point.removeAttribute("aria-describedby");
    tooltip.hidden = true;
    tooltip.style.removeProperty("left");
    tooltip.style.removeProperty("top");
    if (!point || activePoint === point) activePoint = null;
  }

  function scheduleTooltip(point) {
    clearHoverTimer();
    pendingPoint = point;
    hoverTimer = window.setTimeout(() => {
      hoverTimer = null;
      if (
        pendingPoint === point &&
        point.isConnected &&
        point.matches(":hover")
      ) {
        showTooltip(point);
      }
    }, HOVER_DELAY_MS);
  }

  document.addEventListener("pointerover", (event) => {
    if (!finePointer.matches || (event.pointerType && event.pointerType !== "mouse")) return;

    const point = closestPoint(event.target);
    if (!point) return;
    if (event.relatedTarget instanceof Node && point.contains(event.relatedTarget)) return;

    scheduleTooltip(point);
  });

  document.addEventListener("pointerout", (event) => {
    const point = closestPoint(event.target);
    if (!point) return;
    if (event.relatedTarget instanceof Node && point.contains(event.relatedTarget)) return;

    if (pendingPoint === point) pendingPoint = null;
    clearHoverTimer();
    if (activePoint === point) hideTooltip(point);
  });

  document.addEventListener("focusin", (event) => {
    const point = closestPoint(event.target);
    if (!point) return;

    clearHoverTimer();
    pendingPoint = null;
    showTooltip(point);
  });

  document.addEventListener("focusout", (event) => {
    const point = closestPoint(event.target);
    if (!point || activePoint !== point) return;
    hideTooltip(point);
  });

  document.addEventListener("click", (event) => {
    if (closestPoint(event.target)) hideTooltip();
  });

  window.addEventListener("resize", () => {
    if (activePoint) positionTooltip(activePoint);
  });

  document.addEventListener("scroll", () => {
    if (activePoint) positionTooltip(activePoint);
  }, true);

  const observer = new MutationObserver(() => {
    if (activePoint && !activePoint.isConnected) hideTooltip(activePoint);
    if (pendingPoint && !pendingPoint.isConnected) {
      pendingPoint = null;
      clearHoverTimer();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  finePointer.addEventListener?.("change", () => {
    pendingPoint = null;
    clearHoverTimer();
    hideTooltip();
  });
})();
