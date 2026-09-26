(function enforceBackedRequesterIdentity() {
  "use strict";

  if (window.__MT_REQUESTER_IDENTITY_BRIDGE__) return;
  window.__MT_REQUESTER_IDENTITY_BRIDGE__ = true;

  const ownerName = "Ellen Sun";
  const ownerRole = "Moral Trade operator";
  const syntheticNames = new Set([
    "Mina Park",
    "Eli M.",
    "Metro Data Collaborative",
    "Jordan K.",
  ]);
  const syntheticRoles = new Set([
    "Civic systems engineer",
    "ML engineer",
    "Verified organization",
    "Policy analyst",
  ]);
  const unsupportedMetrics = /^\d{1,3}%\s+on\s+time\s*[·•]\s*\d+\s+completed\s+commitments$/i;

  function normalize(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function replaceTextPreservingSpace(node, replacement) {
    const value = node.nodeValue || "";
    const leading = value.match(/^\s*/)?.[0] || "";
    const trailing = value.match(/\s*$/)?.[0] || "";
    node.nodeValue = `${leading}${replacement}${trailing}`;
  }

  function textNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();

    while (current) {
      nodes.push(current);
      current = walker.nextNode();
    }

    return nodes;
  }

  function isBackedFeedIdentityNode(node) {
    return Boolean(
      node.parentElement?.closest(
        "[data-mt-live-trade-feed], [data-feed-item-id], .mt-feed-card[data-opportunity-id]",
      ),
    );
  }

  function containsRequesterLabel(element) {
    return /\bREQUESTED\s+BY\b/i.test(normalize(element?.textContent));
  }

  function findRequesterBlock(node) {
    let element = node.parentElement;
    let nearest = null;

    for (let depth = 0; element && depth < 10; depth += 1) {
      if (containsRequesterLabel(element)) {
        nearest = element;
        if (
          element.matches(
            "article, li, section, [role='listitem'], [class*='card'], [class*='request']",
          )
        ) {
          return element;
        }
      }
      element = element.parentElement;
    }

    return nearest;
  }

  function hideUnsupportedMetric(node) {
    let element = node.parentElement;
    const metric = normalize(node.nodeValue);

    while (
      element?.parentElement &&
      !element.parentElement.matches("body, html") &&
      normalize(element.parentElement.textContent) === metric
    ) {
      element = element.parentElement;
    }

    if (element) {
      element.textContent = "";
      element.hidden = true;
      element.setAttribute("aria-hidden", "true");
      element.setAttribute("data-mt-unsupported-requester-metric", "removed");
    } else {
      node.nodeValue = "";
    }
  }

  function normalizeRequesterBlock(block) {
    let changed = false;

    textNodes(block).forEach((node) => {
      const value = normalize(node.nodeValue);

      if (syntheticNames.has(value)) {
        replaceTextPreservingSpace(node, ownerName);
        changed = true;
        return;
      }

      if (syntheticRoles.has(value)) {
        replaceTextPreservingSpace(node, ownerRole);
        changed = true;
        return;
      }

      if (unsupportedMetrics.test(value)) {
        hideUnsupportedMetric(node);
        changed = true;
      }
    });

    if (changed) {
      block.setAttribute("data-mt-requester-identity", "ellen-sun");
    }

    return changed;
  }

  function apply() {
    const syntheticNameNodes = textNodes(document.body).filter(
      (node) =>
        !isBackedFeedIdentityNode(node) && syntheticNames.has(normalize(node.nodeValue)),
    );

    syntheticNameNodes.forEach((node) => {
      const block = findRequesterBlock(node);
      if (block) {
        normalizeRequesterBlock(block);
      } else {
        replaceTextPreservingSpace(node, ownerName);
      }
    });
  }

  let scheduled = false;
  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      apply();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  } else {
    apply();
  }

  new MutationObserver(scheduleApply).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
